"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Bell, Check, Plus, Repeat2, Trash2, X } from "lucide-react";
import { categories as defaults, type Task, type TaskInput } from "@/lib/types";
export default function TaskDialog({
  task,
  onClose,
  onSave,
  onDelete,
  categories = [...defaults],
  initialDate = "",
}: {
  task: Task | null;
  onClose: () => void;
  onDelete?: () => void;
  onSave: (value: TaskInput) => Promise<void>;
  categories?: string[];
  initialDate?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    title = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [subtasks, setSubtasks] = useState(task?.subtasks ?? []),
    [newSubtask, setNewSubtask] = useState(""),
    [reminder, setReminder] = useState(task?.reminder ?? false);
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    title.current?.focus();
    return () => {
      el?.close();
      document.body.style.overflow = previous;
    };
  }, []);
  function addSubtask() {
    const value = newSubtask.trim();
    if (!value || subtasks.length >= 50) return;
    setSubtasks([
      ...subtasks,
      { id: crypto.randomUUID(), title: value, done: false },
    ]);
    setNewSubtask("");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const list = newSubtask.trim()
        ? [
            ...subtasks,
            { id: crypto.randomUUID(), title: newSubtask.trim(), done: false },
          ]
        : subtasks;
      await onSave({
        title: String(form.get("title")).trim(),
        description: String(form.get("description")).trim(),
        category: String(form.get("category")),
        priority: form.get("priority") as Task["priority"],
        status: form.get("status") as Task["status"],
        dueDate: String(form.get("dueDate")) || null,
        dueTime: String(form.get("dueTime")) || null,
        recurrence: form.get("recurrence") as Task["recurrence"],
        reminder,
        estimatedMinutes: Number(form.get("estimatedMinutes")) || 0,
        subtasks: list,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
      setBusy(false);
    }
  }
  return (
    <dialog
      className="task-dialog tp-detail-dialog"
      ref={dialog}
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="tp-detail-heading">
        <button
          className="icon-button"
          onClick={onClose}
          disabled={busy}
          aria-label="Voltar"
        >
          <ArrowLeft size={21} />
        </button>
        <h2 id="dialog-title">{task ? "Detalhes da Tarefa" : "Nova Tarefa"}</h2>
        <button
          className="icon-button tp-desktop-close"
          onClick={onClose}
          disabled={busy}
          aria-label="Fechar"
        >
          <X size={20} />
        </button>
      </div>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <label>
            Tarefa
            <input
              className="tp-title-input"
              ref={title}
              name="title"
              defaultValue={task?.title ?? ""}
              placeholder="O que precisa ser feito?"
              required
              maxLength={160}
            />
          </label>
          <div className="form-grid">
            <label>
              Categoria
              <select
                name="category"
                defaultValue={task?.category ?? "Pessoal"}
              >
                {[
                  ...new Set([...categories, ...(task ? [task.category] : [])]),
                ].map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select name="status" defaultValue={task?.status ?? "pending"}>
                <option value="pending">Pendente</option>
                <option value="progress">Em andamento</option>
                <option value="completed">Concluída</option>
              </select>
            </label>
            <label>
              Data
              <input
                type="date"
                name="dueDate"
                min="1900-01-01"
                max="9999-12-31"
                defaultValue={task?.dueDate ?? initialDate}
              />
            </label>
            <label>
              Horário
              <input
                type="time"
                name="dueTime"
                defaultValue={task?.dueTime ?? ""}
              />
            </label>
          </div>
          <label className="tp-switch-row">
            <span>
              <Bell size={18} />
              Lembrar desta tarefa
            </span>
            <input
              type="checkbox"
              checked={reminder}
              onChange={(e) => setReminder(e.target.checked)}
            />
          </label>
          <label>
            <span className="tp-label-icon">
              <Repeat2 size={17} />
              Repetição
            </span>
            <select name="recurrence" defaultValue={task?.recurrence ?? "none"}>
              <option value="none">Não se repete</option>
              <option value="daily">Todos os dias</option>
              <option value="weekly">Toda semana</option>
              <option value="monthly">Todo mês</option>
            </select>
            <small className="tp-help-text">
              Ao concluir, cria a próxima ocorrência a partir do prazo.
            </small>
          </label>
          <label>
            Descrição
            <textarea
              name="description"
              rows={3}
              defaultValue={task?.description ?? ""}
              maxLength={4000}
              placeholder="Adicione detalhes à sua tarefa…"
            />
          </label>
          <section className="tp-subtasks">
            <h3>
              Subtarefas{" "}
              <span>
                ({subtasks.filter((s) => s.done).length}/{subtasks.length})
              </span>
            </h3>
            {subtasks.map((s) => (
              <div key={s.id} className="tp-subtask">
                <button
                  type="button"
                  className={"tp-check " + (s.done ? "checked" : "")}
                  aria-label={(s.done ? "Reabrir: " : "Concluir: ") + s.title}
                  onClick={() =>
                    setSubtasks(
                      subtasks.map((v) =>
                        v.id === s.id ? { ...v, done: !v.done } : v,
                      ),
                    )
                  }
                >
                  {s.done && <Check size={15} />}
                </button>
                <span className={s.done ? "done" : ""}>{s.title}</span>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={"Remover subtarefa: " + s.title}
                  onClick={() =>
                    setSubtasks(subtasks.filter((v) => v.id !== s.id))
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <div className="tp-add-subtask">
              <input
                aria-label="Adicionar subtarefa"
                placeholder="Adicionar subtarefa"
                value={newSubtask}
                maxLength={160}
                disabled={subtasks.length >= 50}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSubtask();
                  }
                }}
              />
              <button
                className="icon-button"
                type="button"
                onClick={addSubtask}
                disabled={!newSubtask.trim() || subtasks.length >= 50}
                aria-label="Adicionar subtarefa à lista"
              >
                <Plus size={18} />
              </button>
            </div>
          </section>
          <div className="form-grid">
            <label>
              Prioridade
              <select name="priority" defaultValue={task?.priority ?? "medium"}>
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
              </select>
            </label>
            <label>
              Estimativa (minutos)
              <input
                name="estimatedMinutes"
                type="number"
                min="0"
                max="10080"
                defaultValue={task?.estimatedMinutes ?? 0}
              />
            </label>
          </div>
        </fieldset>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <footer className="dialog-footer">
          {task && onDelete && (
            <button
              type="button"
              className="icon-button"
              aria-label="Excluir tarefa"
              disabled={busy}
              onClick={onDelete}
            >
              <Trash2 size={18} />
            </button>
          )}
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Salvando…" : "Salvar"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
