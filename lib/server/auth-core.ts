import { createHash, randomBytes } from "node:crypto";
import { getDb } from "./database";
import { dummyHash, verifyPassword } from "./password";
import { HttpError } from "./errors";
import { loginSchema } from "../validation";
import type { PublicUser } from "../types";

export const SESSION_SECONDS = 60 * 60 * 24 * 7;
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export async function login(input: unknown) {
  const { email, password } = loginSchema.parse(input);
  const db = getDb();
  const now = Date.now();
  const key = tokenHash(`login:${email}`);
  // Atomic, shared by all serverless instances; never rely on process-local counters.
  const limit = await db.execute({
    sql: `INSERT INTO login_limits(key, attempts, reset_at) VALUES (?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET
        attempts = CASE WHEN reset_at <= ? THEN 1 ELSE attempts + 1 END,
        reset_at = CASE WHEN reset_at <= ? THEN excluded.reset_at ELSE reset_at END
      RETURNING attempts`,
    args: [key, now + 15 * 60 * 1000, now, now],
  });
  if (Number(limit.rows[0].attempts) > 5)
    throw new HttpError(
      429,
      "Muitas tentativas. Aguarde 15 minutos e tente novamente.",
    );
  const result = await db.execute({
    sql: "SELECT id, email, name, password_hash FROM users WHERE email = ?",
    args: [email],
  });
  const row = result.rows[0];
  const valid = await verifyPassword(
    password,
    row ? String(row.password_hash) : dummyHash,
  );
  if (!row || !valid) throw new HttpError(401, "E-mail ou senha incorretos.");
  const token = randomBytes(32).toString("base64url");
  const expiresAt = now + SESSION_SECONDS * 1000;
  await db.batch(
    [
      {
        sql: "DELETE FROM login_limits WHERE key = ? OR reset_at <= ?",
        args: [key, now],
      },
      { sql: "DELETE FROM sessions WHERE expires_at <= ?", args: [now] },
      {
        sql: "INSERT INTO sessions(token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
        args: [tokenHash(token), String(row.id), expiresAt, now],
      },
    ],
    "write",
  );
  return {
    token,
    expiresAt,
    user: {
      id: String(row.id),
      name: String(row.name),
      email: String(row.email),
    },
  };
}

export async function sessionUser(
  token: string | undefined,
): Promise<PublicUser | null> {
  if (!token || !/^[a-zA-Z0-9_-]{43}$/.test(token)) return null;
  const result = await getDb().execute({
    sql: "SELECT u.id, u.name, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?",
    args: [tokenHash(token), Date.now()],
  });
  const row = result.rows[0];
  return row
    ? { id: String(row.id), name: String(row.name), email: String(row.email) }
    : null;
}

export async function revokeSession(token: string | undefined) {
  if (token && /^[a-zA-Z0-9_-]{43}$/.test(token)) {
    await getDb().execute({
      sql: "DELETE FROM sessions WHERE token_hash = ?",
      args: [tokenHash(token)],
    });
  }
}
