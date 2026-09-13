export const categories = [
  "Pessoal",
  "Trabalho",
  "Família",
  "Estudos",
  "Saúde",
  "Finanças",
  "Viagem",
  "Casa",
] as const;
export const priorities = ["low", "medium", "high"] as const;
export const statuses = ["pending", "progress", "completed"] as const;
export type Task = {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: (typeof priorities)[number];
  status: (typeof statuses)[number];
  dueDate: string | null;
  createdAt: number;
  updatedAt: number;
  version: number;
  dueTime?: string | null;
  reminder?: boolean;
  recurrence?: "none" | "daily" | "weekly" | "monthly";
  subtasks?: { id: string; title: string; done: boolean }[];
  estimatedMinutes?: number;
  completedAt?: number | null;
};
export type TaskInput = Pick<
  Task,
  | "title"
  | "description"
  | "category"
  | "priority"
  | "status"
  | "dueDate"
  | "dueTime"
  | "reminder"
  | "recurrence"
  | "subtasks"
  | "estimatedMinutes"
>;
export type PublicUser = { id: string; name: string; email: string };
