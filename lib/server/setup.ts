import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { emailSchema, passwordSchema } from "../validation";
import { getDb } from "./database";
import { HttpError } from "./errors";
import { hashPassword } from "./password";
import { migrate } from "./migrate";

type Access = { hash: string; expiresAt: number };
export function validateSetupAccess(token: unknown, access: Access) {
  if (
    typeof token !== "string" ||
    !/^[A-Za-z0-9_-]{43}$/.test(token) ||
    !/^[a-f0-9]{64}$/.test(access.hash) ||
    Date.now() >= access.expiresAt
  ) {
    throw new HttpError(403, "O link de configuração é inválido ou expirou.");
  }
  const digest = createHash("sha256").update(token).digest();
  if (!timingSafeEqual(digest, Buffer.from(access.hash, "hex")))
    throw new HttpError(403, "O link de configuração é inválido ou expirou.");
}

export async function completeSetup(input: unknown, access: Access) {
  // Validate the capability before touching the database or performing migrations.
  const token =
    typeof input === "object" && input !== null && "token" in input
      ? input.token
      : undefined;
  validateSetupAccess(token, access);
  const value = z
    .object({
      token: z.string(),
      name: z.string().trim().min(1, "Informe seu nome.").max(80),
      email: emailSchema,
      password: passwordSchema,
    })
    .strict()
    .parse(input);
  await migrate();
  const passwordHash = await hashPassword(value.password);
  const db = getDb();
  const transaction = await db.transaction("write");
  let closed = false;
  try {
    const lock = await transaction.execute(
      "SELECT id FROM app_setup WHERE id = 1",
    );
    const users = await transaction.execute("SELECT id FROM users LIMIT 1");
    if (lock.rows.length || users.rows.length) {
      await transaction.execute({
        sql: "INSERT OR IGNORE INTO app_setup(id, completed_at) VALUES (1, ?)",
        args: [Date.now()],
      });
      closed = true;
    } else {
      await transaction.execute({
        sql: "INSERT INTO users(id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
        args: [randomUUID(), value.email, value.name, passwordHash, Date.now()],
      });
      await transaction.execute({
        sql: "INSERT INTO app_setup(id, completed_at) VALUES (1, ?)",
        args: [Date.now()],
      });
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  } finally {
    transaction.close();
  }
  if (closed)
    throw new HttpError(
      409,
      "A configuração inicial já foi concluída. Entre com sua conta.",
    );
}
