import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { completeSetup } from "../lib/server/setup";
import { getDb } from "../lib/server/database";
import { verifyPassword } from "../lib/server/password";

const token = randomBytes(32).toString("base64url");
const access = {
  hash: createHash("sha256").update(token).digest("hex"),
  expiresAt: Date.now() + 60000,
};
const input = {
  token,
  name: "Owner",
  email: "owner@example.test",
  password: "setup-test-password-123",
};
let directory: string;
before(async () => {
  directory = await mkdtemp(join(tmpdir(), "tarefas-setup-"));
  process.env.TURSO_DATABASE_URL = `file:${join(directory, "test.db")}`;
  delete process.env.VERCEL;
});
after(async () => {
  getDb().close();
  // Release native SQLite statement handles before deleting files on Windows.
  global.gc?.();
  await rm(directory, {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 100,
  });
});
test("missing or incorrect setup keys cannot initialize the database", async () => {
  await assert.rejects(completeSetup({ ...input, token: "" }, access), {
    status: 403,
  });
  await assert.rejects(
    completeSetup({ ...input, token: "x".repeat(43) }, access),
    { status: 403 },
  );
  assert.equal(
    (
      await getDb().execute(
        "SELECT name FROM sqlite_master WHERE type = 'table'",
      )
    ).rows.length,
    0,
  );
});
test("expired setup key is rejected before migrations", async () => {
  await assert.rejects(completeSetup(input, { ...access, expiresAt: 1 }), {
    status: 403,
  });
});
test("authorized setup creates schema and a password-hashed account", async () => {
  await completeSetup(input, access);
  const users = await getDb().execute("SELECT * FROM users");
  assert.equal(users.rows.length, 1);
  assert.equal(users.rows[0].email, input.email);
  assert.ok(
    await verifyPassword(input.password, String(users.rows[0].password_hash)),
  );
  assert.equal(
    (await getDb().execute("SELECT * FROM schema_migrations")).rows.length,
    4,
  );
  assert.equal(
    (await getDb().execute("SELECT * FROM app_setup")).rows.length,
    1,
  );
});
test("setup remains locked on replay, even after accounts are removed", async () => {
  await assert.rejects(
    completeSetup({ ...input, email: "other@example.test" }, access),
    { status: 409 },
  );
  await getDb().execute("DELETE FROM users");
  await assert.rejects(completeSetup(input, access), { status: 409 });
  assert.equal((await getDb().execute("SELECT * FROM users")).rows.length, 0);
});
