export const categories = [
  "Pessoal",
  "Trabalho",
  "Família",
  "Estudos",
] as const;
export const priorities = ["low", "medium", "high"] as const;
export const statuses = ["pending", "progress", "completed"] as const;
export type Task = {
  id: string;
  title: string;
  description: string;
  category: (typeof categories)[number];
  priority: (typeof priorities)[number];
  status: (typeof statuses)[number];
  dueDate: string | null;
  createdAt: number;
  updatedAt: number;
  version: number;
};
export type TaskInput = Pick<
  Task,
  "title" | "description" | "category" | "priority" | "status" | "dueDate"
>;
export type PublicUser = { id: string; name: string; email: string };
