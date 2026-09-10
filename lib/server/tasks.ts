import { randomUUID } from "node:crypto";
import type { Row } from "@libsql/client";
import { getDb } from "./database";
import { taskSchema, updateTaskSchema, deleteTaskSchema } from "../validation";
import { HttpError } from "./errors";
import type { Task } from "../types";

function task(row: Row): Task {
  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description),
    category: row.category as Task["category"],
    priority: row.priority as Task["priority"],
    status: row.status as Task["status"],
    dueDate: row.due_date === null ? null : String(row.due_date),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    version: Number(row.version),
  };
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
    sql: "INSERT INTO tasks(id, user_id, title, description, category, priority, status, due_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *",
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
  const result = await getDb().execute({
    sql: "UPDATE tasks SET title = ?, description = ?, category = ?, priority = ?, status = ?, due_date = ?, updated_at = ?, version = version + 1 WHERE id = ? AND user_id = ? AND version = ? RETURNING *",
    args: [
      value.title,
      value.description,
      value.category,
      value.priority,
      value.status,
      value.dueDate,
      Date.now(),
      id,
      userId,
      value.version,
    ],
  });
  if (!result.rows.length) return conflictOrMissing(userId, id);
  return task(result.rows[0]);
}
export async function deleteTask(userId: string, id: string, input: unknown) {
  const { version } = deleteTaskSchema.parse(input);
  const result = await getDb().execute({
    sql: "DELETE FROM tasks WHERE id = ? AND user_id = ? AND version = ?",
    args: [id, userId, version],
  });
  if (!result.rowsAffected) return conflictOrMissing(userId, id);
}
