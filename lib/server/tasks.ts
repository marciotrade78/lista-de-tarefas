import { createHash, randomUUID } from "node:crypto";
import type { Row } from "@libsql/client";
import { getDb } from "./database";
import { taskSchema, updateTaskSchema, deleteTaskSchema } from "../validation";
import { HttpError } from "./errors";
import type { Task, TaskInput } from "../types";

function task(row: Row): Task {
  const details = JSON.parse(String(row.details ?? "{}"));
  return {
    ...details,
    id: String(row.id),
    title: String(row.title),
    description: String(row.description),
    category: String(row.category),
    priority: row.priority as Task["priority"],
    status: row.status as Task["status"],
    dueDate: row.due_date === null ? null : String(row.due_date),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    version: Number(row.version),
    completedAt: row.completed_at == null ? null : Number(row.completed_at),
  };
}
function details(value: TaskInput, previous?: Task) {
  return JSON.stringify({
    dueTime:
      value.dueTime === undefined ? (previous?.dueTime ?? null) : value.dueTime,
    reminder: value.reminder ?? previous?.reminder ?? false,
    recurrence: value.recurrence ?? previous?.recurrence ?? "none",
    subtasks: value.subtasks ?? previous?.subtasks ?? [],
    estimatedMinutes: value.estimatedMinutes ?? previous?.estimatedMinutes ?? 0,
  });
}
export async function listTasks(userId: string) {
  const result = await getDb().execute({
    sql: "SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC",
    args: [userId],
  });
  return result.rows.map(task);
}
export async function createTask(userId: string, input: unknown) {
  const value = taskSchema.parse(input);
  const now = Date.now();
  const result = await getDb().execute({
    sql: "INSERT INTO tasks(id,user_id,title,description,category,priority,status,due_date,created_at,updated_at,details,completed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) RETURNING *",
    args: [
      randomUUID(),
      userId,
      value.title,
      value.description,
      value.category,
      value.priority,
      value.status,
      value.dueDate,
      now,
      now,
      details(value),
      value.status === "completed" ? now : null,
    ],
  });
  return task(result.rows[0]);
}
async function conflictOrMissing(userId: string, id: string): Promise<never> {
  const result = await getDb().execute({
    sql: "SELECT id FROM tasks WHERE id = ? AND user_id = ?",
    args: [id, userId],
  });
  if (!result.rows.length) throw new HttpError(404, "Tarefa não encontrada.");
  throw new HttpError(
    409,
    "Esta tarefa mudou em outra janela. Atualize a lista antes de salvar novamente.",
  );
}
export async function updateTask(userId: string, id: string, input: unknown) {
  const value = updateTaskSchema.parse(input);
  const db = getDb();
  const tx = await db.transaction("write");
  try {
    const found = await tx.execute({
      sql: "SELECT * FROM tasks WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    if (!found.rows.length) throw new HttpError(404, "Tarefa não encontrada.");
    const previous = task(found.rows[0]);
    if (previous.version !== value.version)
      throw new HttpError(
        409,
        "Esta tarefa mudou em outra janela. Atualize a lista antes de salvar novamente.",
      );
    const now = Date.now();
    const result = await tx.execute({
      sql: "UPDATE tasks SET title=?,description=?,category=?,priority=?,status=?,due_date=?,updated_at=?,version=version+1,details=?,completed_at=? WHERE id=? AND user_id=? AND version=? RETURNING *",
      args: [
        value.title,
        value.description,
        value.category,
        value.priority,
        value.status,
        value.dueDate,
        now,
        details(value, previous),
        value.status === "completed" ? (previous.completedAt ?? now) : null,
        id,
        userId,
        value.version,
      ],
    });
    const saved = task(result.rows[0]);
    // Generate the next occurrence exactly once, within the same transaction.
    if (
      previous.status !== "completed" &&
      saved.status === "completed" &&
      saved.dueDate &&
      saved.recurrence &&
      saved.recurrence !== "none"
    ) {
      const date = new Date(saved.dueDate + "T12:00:00Z");
      if (saved.recurrence === "monthly") {
        const day = date.getUTCDate();
        date.setUTCDate(1);
        date.setUTCMonth(date.getUTCMonth() + 1);
        const last = new Date(
          Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
        ).getUTCDate();
        date.setUTCDate(Math.min(day, last));
      } else
        date.setUTCDate(
          date.getUTCDate() + (saved.recurrence === "daily" ? 1 : 7),
        );
      const nextId = createHash("sha256")
        .update(id + ":" + saved.dueDate)
        .digest("hex");
      if (date.getUTCFullYear() <= 9999)
        await tx.execute({
          sql: "INSERT OR IGNORE INTO tasks(id,user_id,title,description,category,priority,status,due_date,created_at,updated_at,details) VALUES (?,?,?,?,?,?,'pending',?,?,?,?)",
          args: [
            nextId,
            userId,
            saved.title,
            saved.description,
            saved.category,
            saved.priority,
            date.toISOString().slice(0, 10),
            now,
            now,
            details({
              ...saved,
              subtasks: saved.subtasks?.map((s) => ({ ...s, done: false })),
            }),
          ],
        });
    }
    await tx.commit();
    return saved;
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally {
    tx.close();
  }
}
export async function deleteTask(userId: string, id: string, input: unknown) {
  const { version } = deleteTaskSchema.parse(input);
  const result = await getDb().execute({
    sql: "DELETE FROM tasks WHERE id = ? AND user_id = ? AND version = ?",
    args: [id, userId, version],
  });
  if (!result.rowsAffected) return conflictOrMissing(userId, id);
}
