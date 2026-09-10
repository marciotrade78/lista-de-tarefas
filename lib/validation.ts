import { z } from "zod";
import { categories, priorities, statuses } from "./types";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Informe um e-mail válido.")
  .max(254);
export const passwordSchema = z
  .string()
  .min(12, "Use pelo menos 12 caracteres.")
  .max(128, "Use no máximo 128 caracteres.");
export const loginSchema = z
  .object({ email: emailSchema, password: z.string().min(1).max(128) })
  .strict();
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
  .refine((value) => {
    const date = new Date(`${value}T12:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value &&
      value >= "1900-01-01" &&
      value <= "9999-12-31"
    );
  }, "Data inválida.");
export const taskSchema = z
  .object({
    title: z.string().trim().min(1, "Informe o título da tarefa.").max(160),
    description: z.string().trim().max(4000).default(""),
    category: z.enum(categories),
    priority: z.enum(priorities),
    status: z.enum(statuses),
    dueDate: dateSchema.nullable(),
  })
  .strict();
export const updateTaskSchema = taskSchema.extend({
  version: z.number().int().nonnegative(),
});
export const deleteTaskSchema = z
  .object({ version: z.number().int().nonnegative() })
  .strict();
