import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "../lib/server/migrate";
import {
  createInvite,
  revokeInvite,
  registerWithInvite,
} from "../lib/server/invite";
import { getDb } from "../lib/server/database";
import { verifyPassword } from "../lib/server/password";

let directory: string;
before(async () => {
  directory = await mkdtemp(join(tmpdir(), "tarefas-invite-"));
  process.env.TURSO_DATABASE_URL = `file:${join(directory, "test.db")}`;
  delete process.env.VERCEL;
  await migrate();
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

test("registration without a valid invite token is rejected", async () => {
  await createInvite();
  await assert.rejects(
    registerWithInvite({
      token: "",
      name: "Alice",
      email: "alice@example.test",
      password: "invite-test-password-1",
    }),
    { status: 403 },
  );
  await assert.rejects(
    registerWithInvite({
      token: "x".repeat(43),
      name: "Alice",
      email: "alice@example.test",
      password: "invite-test-password-1",
    }),
    { status: 403 },
  );
  assert.equal((await getDb().execute("SELECT * FROM users")).rows.length, 0);
});

test("a valid invite token creates a password-hashed account and can be reused by someone else", async () => {
  const token = await createInvite();
  await registerWithInvite({
    token,
    name: "Alice",
    email: "alice@example.test",
    password: "invite-test-password-1",
  });
  await registerWithInvite({
    token,
    name: "Bob",
    email: "bob@example.test",
    password: "invite-test-password-2",
  });
  const users = await getDb().execute("SELECT * FROM users ORDER BY email");
  assert.equal(users.rows.length, 2);
  assert.equal(users.rows[0].email, "alice@example.test");
  assert.ok(
    await verifyPassword(
      "invite-test-password-1",
      String(users.rows[0].password_hash),
    ),
  );
});

test("an existing email cannot register again", async () => {
  const token = await createInvite();
  await assert.rejects(
    registerWithInvite({
      token,
      name: "Alice Again",
      email: "alice@example.test",
      password: "invite-test-password-3",
    }),
    { status: 409 },
  );
});

test("creating a new invite invalidates the previous link", async () => {
  const first = await createInvite();
  await createInvite();
  await assert.rejects(
    registerWithInvite({
      token: first,
      name: "Carol",
      email: "carol@example.test",
      password: "invite-test-password-4",
    }),
    { status: 403 },
  );
});

test("a revoked invite rejects new registrations", async () => {
  const token = await createInvite();
  await revokeInvite();
  await assert.rejects(
    registerWithInvite({
      token,
      name: "Dave",
      email: "dave@example.test",
      password: "invite-test-password-5",
    }),
    { status: 403 },
  );
});
