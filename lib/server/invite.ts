import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { emailSchema, passwordSchema } from "../validation";
import { getDb } from "./database";
import { hashPassword } from "./password";
import { HttpError } from "./errors";

const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export async function createInvite() {
  const token = randomBytes(32).toString("base64url");
  await getDb().execute({
    sql: "INSERT INTO invite_link(id, token_hash, enabled, created_at) VALUES (1, ?, 1, ?) ON CONFLICT(id) DO UPDATE SET token_hash = excluded.token_hash, enabled = 1, created_at = excluded.created_at",
    args: [tokenHash(token), Date.now()],
  });
  return token;
}

export async function revokeInvite() {
  await getDb().execute("UPDATE invite_link SET enabled = 0 WHERE id = 1");
}

async function requireValidInvite(token: unknown) {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new HttpError(403, "O link de convite é inválido ou expirou.");
  const result = await getDb().execute(
    "SELECT token_hash, enabled FROM invite_link WHERE id = 1",
  );
  const row = result.rows[0];
  if (!row || !row.enabled)
    throw new HttpError(403, "O link de convite é inválido ou expirou.");
  const digest = createHash("sha256").update(token).digest();
  const stored = Buffer.from(String(row.token_hash), "hex");
  if (digest.length !== stored.length || !timingSafeEqual(digest, stored))
    throw new HttpError(403, "O link de convite é inválido ou expirou.");
}

export async function registerWithInvite(input: unknown) {
  const token =
    typeof input === "object" && input !== null && "token" in input
      ? input.token
      : undefined;
  // Validate the invite before touching user data or the database further.
  await requireValidInvite(token);
  const { name, email, password } = z
    .object({
      token: z.string(),
      name: z.string().trim().min(1, "Informe seu nome.").max(80),
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
    throw new HttpError(409, "Este e-mail já possui uma conta. Entre normalmente.");
  await db.execute({
    sql: "INSERT INTO users(id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
    args: [randomUUID(), email, name, await hashPassword(password), Date.now()],
  });
}
