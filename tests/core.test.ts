import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "../lib/server/migrate";
import { getDb } from "../lib/server/database";
import { provisionUser, resetPassword } from "../lib/server/users";
import {
  login,
  revokeSession,
  sessionUser,
  tokenHash,
} from "../lib/server/auth-core";
import {
  createTask,
  deleteTask,
  listTasks,
  updateTask,
} from "../lib/server/tasks";
import { dateSchema } from "../lib/validation";
import type { TaskInput } from "../lib/types";

let directory: string;
let alice: { id: string };
let bob: { id: string };
const password = "test-only-long-password-123";
const input: TaskInput = {
  title: "Verificar instrumento",
  description: "Conferir o prazo",
  category: "Trabalho",
  priority: "high",
  status: "pending",
  dueDate: "2028-02-29",
};
before(async () => {
  directory = await mkdtemp(join(tmpdir(), "tarefas-core-"));
  process.env.TURSO_DATABASE_URL = `file:${join(directory, "test.db")}`;
  delete process.env.VERCEL;
  await migrate();
  alice = await provisionUser({
    name: "Alice",
    email: "alice@example.test",
    password,
  });
  bob = await provisionUser({
    name: "Bob",
    email: "bob@example.test",
    password,
  });
});
after(async () => {
  getDb().close();
  await rm(directory, { recursive: true, force: true });
});

test("migrations are idempotent and passwords are hashed with distinct salts", async () => {
  assert.deepEqual(await migrate(), []);
  const result = await getDb().execute("SELECT password_hash FROM users");
  assert.notEqual(result.rows[0].password_hash, password);
  assert.notEqual(result.rows[0].password_hash, result.rows[1].password_hash);
  assert.match(String(result.rows[0].password_hash), /^scrypt-v1\$/);
});
test("session tokens are hashed at rest, expire, and are revoked", async () => {
  const result = await login({ email: " ALICE@example.test ", password });
  assert.equal((await sessionUser(result.token))?.id, alice.id);
  const stored = await getDb().execute({
    sql: "SELECT token_hash FROM sessions WHERE user_id = ?",
    args: [alice.id],
  });
  assert.equal(stored.rows[0].token_hash, tokenHash(result.token));
  assert.notEqual(stored.rows[0].token_hash, result.token);
  await getDb().execute({
    sql: "UPDATE sessions SET expires_at = 1 WHERE token_hash = ?",
    args: [tokenHash(result.token)],
  });
  assert.equal(await sessionUser(result.token), null);
  const next = await login({ email: "alice@example.test", password });
  await revokeSession(next.token);
  assert.equal(await sessionUser(next.token), null);
});
test("task lifecycle preserves ownership and rejects stale writes", async () => {
  const task = await createTask(alice.id, input);
  assert.equal((await listTasks(alice.id)).length, 1);
  assert.equal((await listTasks(bob.id)).length, 0);
  await assert.rejects(updateTask(bob.id, task.id, { ...input, version: 0 }), {
    status: 404,
  });
  await assert.rejects(deleteTask(bob.id, task.id, { version: 0 }), {
    status: 404,
  });
  const updated = await updateTask(alice.id, task.id, {
    ...input,
    status: "completed",
    version: 0,
  });
  assert.equal(updated.status, "completed");
  assert.equal(updated.version, 1);
  await assert.rejects(
    updateTask(alice.id, task.id, { ...input, version: 0 }),
    { status: 409 },
  );
  await assert.rejects(deleteTask(alice.id, task.id, { version: 0 }), {
    status: 409,
  });
  await deleteTask(alice.id, task.id, { version: 1 });
  assert.equal((await listTasks(alice.id)).length, 0);
});
test("SQL-like strings remain data and unknown owner fields are rejected", async () => {
  const title = "'); DROP TABLE users; --";
  const task = await createTask(alice.id, { ...input, title });
  assert.equal(task.title, title);
  assert.equal((await getDb().execute("SELECT id FROM users")).rows.length, 2);
  await assert.rejects(createTask(alice.id, { ...input, userId: bob.id }));
  await deleteTask(alice.id, task.id, { version: task.version });
});
test("calendar dates reject impossible days", () => {
  assert.equal(dateSchema.safeParse("2027-02-29").success, false);
  assert.equal(dateSchema.safeParse("2028-02-29").success, true);
  assert.equal(dateSchema.safeParse("2026-04-31").success, false);
});
test("rate limit persists in the database across attempts", async () => {
  for (let count = 0; count < 5; count++)
    await assert.rejects(
      login({ email: "bob@example.test", password: "incorrect" }),
      { status: 401 },
    );
  await assert.rejects(login({ email: "bob@example.test", password }), {
    status: 429,
  });
  await getDb().execute("UPDATE login_limits SET reset_at = 1");
  assert.equal(
    (await login({ email: "bob@example.test", password })).user.id,
    bob.id,
  );
});
test("password reset invalidates existing sessions and the previous password", async () => {
  const result = await login({ email: "alice@example.test", password });
  await resetPassword("alice@example.test", "test-only-replacement-password");
  assert.equal(await sessionUser(result.token), null);
  await assert.rejects(login({ email: "alice@example.test", password }), {
    status: 401,
  });
  assert.equal(
    (
      await login({
        email: "alice@example.test",
        password: "test-only-replacement-password",
      })
    ).user.id,
    alice.id,
  );
});
