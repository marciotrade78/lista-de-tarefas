import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { getDb } from "./database";

export async function migrate(directory = join(process.cwd(), "migrations")) {
  const db = getDb();
  await db.execute(
    "CREATE TABLE IF NOT EXISTS schema_migrations(name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at INTEGER NOT NULL)",
  );
  const files = (await readdir(directory))
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort();
  const applied: string[] = [];
  for (const name of files) {
    const sql = await readFile(join(directory, name), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const transaction = await db.transaction("write");
    try {
      const previous = await transaction.execute({
        sql: "SELECT checksum FROM schema_migrations WHERE name = ?",
        args: [name],
      });
      if (previous.rows.length) {
        if (previous.rows[0].checksum !== checksum)
          throw new Error(
            `A migração ${name} foi alterada após aplicação. Crie uma nova migração.`,
          );
      } else {
        // Migrations use plain DDL; do not put semicolons inside SQL literals or triggers.
        for (const statement of sql
          .split(";")
          .map((value) => value.trim())
          .filter(Boolean))
          await transaction.execute(statement);
        await transaction.execute({
          sql: "INSERT INTO schema_migrations(name, checksum, applied_at) VALUES (?, ?, ?)",
          args: [name, checksum, Date.now()],
        });
        applied.push(name);
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    } finally {
      transaction.close();
    }
  }
  return applied;
}
