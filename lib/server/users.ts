import { randomUUID } from "node:crypto";
import { z } from "zod";
import { emailSchema, passwordSchema } from "../validation";
import { getDb } from "./database";
import { hashPassword } from "./password";
import { HttpError } from "./errors";

export async function provisionUser(input: unknown) {
  const { name, email, password } = z
    .object({
      name: z.string().trim().min(1).max(80),
      email: emailSchema,
      password: passwordSchema,
    })
    .strict()
    .parse(input);
  const db = getDb();
  const existing = await db.execute({
    sql: "SELECT id FROM users WHERE email = ?",
    args: [email],
  });
  if (existing.rows.length)
    throw new HttpError(
      409,
      "Este e-mail já possui uma conta. Use a redefinição de senha se necessário.",
    );
  const id = randomUUID();
  await db.execute({
    sql: "INSERT INTO users(id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
    args: [id, email, name, await hashPassword(password), Date.now()],
  });
  return { id, email, name };
}
export async function resetPassword(emailInput: string, passwordInput: string) {
  const email = emailSchema.parse(emailInput);
  const password = passwordSchema.parse(passwordInput);
  const db = getDb();
  const hash = await hashPassword(password);
  const transaction = await db.transaction("write");
  try {
    const user = await transaction.execute({
      sql: "SELECT id FROM users WHERE email = ?",
      args: [email],
    });
    if (!user.rows[0]) throw new HttpError(404, "Conta não encontrada.");
    const id = String(user.rows[0].id);
    await transaction.execute({
      sql: "UPDATE users SET password_hash = ? WHERE id = ?",
      args: [hash, id],
    });
    await transaction.execute({
      sql: "DELETE FROM sessions WHERE user_id = ?",
      args: [id],
    });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  } finally {
    transaction.close();
  }
}
