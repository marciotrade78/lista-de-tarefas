import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "../lib/server/migrate";
import { getDb } from "../lib/server/database";
import { provisionUser } from "../lib/server/users";
import { createTask, listTasks, updateTask } from "../lib/server/tasks";
import {
  getWorkspace,
  addCategory,
  saveProfile,
} from "../lib/server/workspace";
import { taskSchema } from "../lib/validation";
let directory: string;
let owner: { id: string }, other: { id: string };
const input = {
  title: "Revisar",
  description: "",
  category: "Trabalho",
  priority: "medium",
  status: "pending",
  dueDate: "2028-01-31",
} as const;
before(async () => {
  const dir = (directory = await mkdtemp(join(tmpdir(), "tarefas-workspace-")));
  process.env.TURSO_DATABASE_URL = "file:" + join(dir, "test.db");
  delete process.env.VERCEL;
  // Exercise the upgrade against an existing task, not just a fresh database.
  const sql = await readFile(
    join(process.cwd(), "migrations/001_initial.sql"),
    "utf8",
  );
  for (const statement of sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean))
    await getDb().execute(statement);
  owner = await provisionUser({
    name: "Owner",
    email: "workspace@example.test",
    password: "workspace-only-password",
  });
  other = await provisionUser({
    name: "Other",
    email: "other@example.test",
    password: "workspace-only-password",
  });
  await getDb().execute({
    sql: "INSERT INTO tasks(id,user_id,title,description,category,priority,status,due_date,created_at,updated_at,version) VALUES ('legacy',?,'Existing task','','Trabalho','medium','pending','2028-01-31',1,1,3)",
    args: [owner.id],
  });
  await migrate();
});
after(async () => {
  getDb().close();
  global.gc?.();
  await rm(directory, {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 100,
  });
});
test("workspace migration preserves existing tasks and is idempotent", async () => {
  const legacy = (await listTasks(owner.id)).find((t) => t.id === "legacy");
  assert.equal(legacy?.title, "Existing task");
  assert.equal(legacy?.version, 3);
  assert.equal(legacy?.completedAt, null);
  assert.deepEqual(await migrate(), []);
});
test("details persist and legacy status updates do not erase them", async () => {
  const created = await createTask(owner.id, {
    ...input,
    category: "Saúde",
    dueTime: "10:30",
    reminder: true,
    subtasks: [{ id: "one", title: "Preparar", done: true }],
    estimatedMinutes: 90,
  });
  const changed = await updateTask(owner.id, created.id, {
    ...input,
    category: "Saúde",
    version: created.version,
    status: "completed",
  });
  assert.equal(changed.dueTime, "10:30");
  assert.equal(changed.reminder, true);
  assert.equal(changed.subtasks?.length, 1);
  assert.equal(changed.estimatedMinutes, 90);
  assert.ok(changed.completedAt);
  await assert.rejects(
    updateTask(other.id, created.id, { ...input, version: changed.version }),
    { status: 404 },
  );
  await assert.rejects(
    updateTask(owner.id, created.id, { ...input, version: created.version }),
    { status: 409 },
  );
});
test("recurrence clamps month-end and does not duplicate after reopening", async () => {
  const item = await createTask(owner.id, {
    ...input,
    recurrence: "monthly",
    subtasks: [{ id: "sub", title: "Passo", done: true }],
  });
  const done = await updateTask(owner.id, item.id, {
    ...input,
    status: "completed",
    version: 0,
  });
  const next = (await listTasks(owner.id)).filter(
    (t) => t.dueDate === "2028-02-29",
  );
  assert.equal(next.length, 1);
  assert.equal(next[0].subtasks?.[0].done, false);
  const reopened = await updateTask(owner.id, item.id, {
    ...input,
    status: "pending",
    version: done.version,
  });
  await updateTask(owner.id, item.id, {
    ...input,
    status: "completed",
    version: reopened.version,
  });
  assert.equal(
    (await listTasks(owner.id)).filter((t) => t.dueDate === "2028-02-29")
      .length,
    1,
  );
});
test("custom categories and preferences belong to their owner", async () => {
  await addCategory(owner.id, { name: "Projetos" });
  assert.ok((await getWorkspace(owner.id)).categories.includes("Projetos"));
  assert.ok(!(await getWorkspace(other.id)).categories.includes("Projetos"));
  await assert.rejects(addCategory(owner.id, { name: "projetos" }), {
    status: 409,
  });
  const profile = await saveProfile(owner.id, {
    name: "Updated",
    email: "workspace@example.test",
    theme: "dark",
    notifications: false,
    startView: "home",
  });
  assert.equal(profile.name, "Updated");
  assert.equal((await getWorkspace(owner.id)).preferences.theme, "dark");
  assert.equal((await getWorkspace(other.id)).preferences.theme, "light");
  await assert.rejects(
    saveProfile(owner.id, {
      name: "Updated",
      email: "other@example.test",
      theme: "light",
      notifications: true,
      startView: "tasks",
    }),
    { status: 409 },
  );
});
test("task details reject invalid times and oversized subtasks", () => {
  assert.equal(
    taskSchema.safeParse({ ...input, dueTime: "25:00" }).success,
    false,
  );
  assert.equal(
    taskSchema.safeParse({
      ...input,
      subtasks: Array.from({ length: 51 }, () => ({
        id: "s",
        title: "t",
        done: false,
      })),
    }).success,
    false,
  );
  assert.equal(taskSchema.safeParse({ ...input, category: "" }).success, false);
});
