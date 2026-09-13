"use client";
import {
  CalendarDays,
  Check,
  Pencil,
  Trash2,
  ListTodo,
  Plus,
} from "lucide-react";
import type { Task } from "@/lib/types";
import { dayLabel } from "@/lib/dates";
const tones: Record<string, string> = {
  Trabalho: "rose",
  Pessoal: "mint",
  Estudos: "gold",
  Saúde: "sky",
  Finanças: "violet",
  Viagem: "cyan",
  Casa: "slate",
  Família: "violet",
};
export function categoryTone(name: string) {
  return tones[name] ?? "sky";
}
export function CategoryBadge({ name }: { name: string }) {
  return <span className={"tp-badge " + categoryTone(name)}>{name}</span>;
}
export function TaskList({
  tasks,
  today,
  busy,
  onToggle,
  onEdit,
  onDelete,
  onCreate,
  compact = false,
}: {
  tasks: Task[];
  today: string;
  busy: boolean;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onCreate: () => void;
  compact?: boolean;
}) {
  if (!tasks.length)
    return (
      <div className="tp-empty">
        <ListTodo size={34} />
        <h3>Nenhuma tarefa por aqui</h3>
        <p>Um espaço livre para seus próximos passos.</p>
        <button className="primary" onClick={onCreate}>
          <Plus size={18} />
          Criar tarefa
        </button>
      </div>
    );
  return (
    <div className={"tp-task-table " + (compact ? "compact" : "")}>
      {!compact && (
        <div className="tp-table-head" aria-hidden="true">
          <span />
          <span>Tarefa</span>
          <span>Categoria</span>
          <span>Data</span>
          <span>Status</span>
          <span>Ações</span>
        </div>
      )}
      <ul>
        {tasks.map((task) => (
          <li
            key={task.id}
            className={
              "tp-task " + (task.status === "completed" ? "is-done" : "")
            }
          >
            <button
              className={
                "tp-check " + (task.status === "completed" ? "checked" : "")
              }
              disabled={busy}
              aria-label={
                (task.status === "completed" ? "Reabrir: " : "Concluir: ") +
                task.title
              }
              onClick={() => onToggle(task)}
            >
              {task.status === "completed" && <Check size={15} />}
            </button>
            <button
              className="tp-task-name"
              onClick={() => onEdit(task)}
              disabled={busy}
            >
              {task.title}
            </button>
            <div className="tp-task-category">
              <CategoryBadge name={task.category} />
            </div>
            <span
              className={
                "tp-task-date " +
                (task.dueDate &&
                task.dueDate < today &&
                task.status !== "completed"
                  ? "late"
                  : "")
              }
            >
              <CalendarDays size={15} />
              {task.dueDate ? dayLabel(task.dueDate, today) : "Sem prazo"}
              {task.dueTime ? ", " + task.dueTime : ""}
            </span>
            <span
              className={
                "tp-badge tp-task-status " +
                (task.status === "completed"
                  ? "mint"
                  : task.status === "progress"
                    ? "gold"
                    : "rose")
              }
            >
              {task.status === "completed"
                ? "Concluída"
                : task.status === "progress"
                  ? "Em andamento"
                  : "Pendente"}
            </span>
            <div className="tp-task-actions">
              <button
                className="icon-button"
                aria-label={"Editar: " + task.title}
                disabled={busy}
                onClick={() => onEdit(task)}
              >
                <Pencil size={16} />
              </button>
              <button
                className="icon-button delete-button"
                aria-label={"Excluir: " + task.title}
                disabled={busy}
                onClick={() => onDelete(task)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
