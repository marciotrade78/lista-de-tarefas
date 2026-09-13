import { z } from "zod";
import { getDb } from "./database";
import { categories } from "../types";
import { emailSchema } from "../validation";
import { HttpError } from "./errors";

export async function getWorkspace(userId: string) {
  const db = getDb();
  const [custom, prefs, used] = await Promise.all([
    db.execute({
      sql: "SELECT name FROM user_categories WHERE user_id = ? ORDER BY name",
      args: [userId],
    }),
    db.execute({
      sql: "SELECT * FROM user_preferences WHERE user_id = ?",
      args: [userId],
    }),
    db.execute({
      sql: "SELECT DISTINCT category FROM tasks WHERE user_id = ?",
      args: [userId],
    }),
  ]);
  const p = prefs.rows[0];
  return {
    categories: [
      ...new Set([
        ...categories,
        ...custom.rows.map((r) => String(r.name)),
        ...used.rows.map((r) => String(r.category)),
      ]),
    ],
    preferences: {
      theme: String(p?.theme ?? "light"),
      notifications: p ? Boolean(p.notifications) : true,
      startView: String(p?.start_view ?? "tasks"),
    },
  };
}
export async function addCategory(userId: string, input: unknown) {
  const { name } = z
    .object({ name: z.string().trim().min(1).max(40) })
    .strict()
    .parse(input);
  const existing = await getWorkspace(userId);
  if (
    existing.categories.some(
      (n) => n.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"),
    )
  )
    throw new HttpError(409, "Esta categoria já existe.");
  await getDb().execute({
    sql: "INSERT INTO user_categories(user_id,name) VALUES (?,?)",
    args: [userId, name],
  });
  return name;
}
export async function saveProfile(userId: string, input: unknown) {
  const value = z
    .object({
      name: z.string().trim().min(1).max(80),
      email: emailSchema,
      theme: z.enum(["light", "dark", "auto"]),
      notifications: z.boolean(),
      startView: z.enum(["home", "tasks", "calendar"]),
    })
    .strict()
    .parse(input);
  const tx = await getDb().transaction("write");
  try {
    const exists = await tx.execute({
      sql: "SELECT id FROM users WHERE email = ? AND id != ?",
      args: [value.email, userId],
    });
    if (exists.rows.length)
      throw new HttpError(409, "Este e-mail já está em uso.");
    await tx.execute({
      sql: "UPDATE users SET name=?,email=? WHERE id=?",
      args: [value.name, value.email, userId],
    });
    await tx.execute({
      sql: "INSERT INTO user_preferences(user_id,theme,notifications,start_view) VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET theme=excluded.theme,notifications=excluded.notifications,start_view=excluded.start_view",
      args: [userId, value.theme, Number(value.notifications), value.startView],
    });
    await tx.commit();
    return { id: userId, name: value.name, email: value.email };
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally {
    tx.close();
  }
}
