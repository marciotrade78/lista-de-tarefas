"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { categories, type Task, type TaskInput } from "@/lib/types";

export default function TaskDialog({
  task,
  onClose,
  onSave,
}: {
  task: Task | null;
  onClose: () => void;
  onSave: (value: TaskInput) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    title.current?.focus();
    return () => el?.close();
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await onSave({
        title: String(form.get("title")).trim(),
        description: String(form.get("description")).trim(),
        category: form.get("category") as Task["category"],
        priority: form.get("priority") as Task["priority"],
        status: form.get("status") as Task["status"],
        dueDate: String(form.get("dueDate")) || null,
      });
      onClose();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Não foi possível salvar.",
      );
      setBusy(false);
    }
  }
  return (
    <dialog
      className="task-dialog"
      ref={dialog}
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="dialog-header">
        <div>
          <span className="eyebrow">ORGANIZE SEU DIA</span>
          <h2 id="dialog-title">{task ? "Editar tarefa" : "Nova tarefa"}</h2>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="Fechar"
          disabled={busy}
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <label>
            O que precisa ser feito?
            <input
              ref={title}
              name="title"
              placeholder="Ex.: Revisar os compromissos da semana"
              defaultValue={task?.title ?? ""}
              required
              maxLength={160}
            />
          </label>
          <label>
            Descrição <span className="optional">(opcional)</span>
            <textarea
              name="description"
              rows={3}
              placeholder="Adicione detalhes para lembrar depois…"
              defaultValue={task?.description ?? ""}
              maxLength={4000}
            />
          </label>
          <div className="form-grid">
            <label>
              Categoria
              <select
                name="category"
                defaultValue={task?.category ?? "Pessoal"}
              >
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <label>
              Prioridade
              <select name="priority" defaultValue={task?.priority ?? "medium"}>
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
              </select>
            </label>
            <label>
              Prazo <span className="optional">(opcional)</span>
              <input
                type="date"
                name="dueDate"
                min="1900-01-01"
                max="9999-12-31"
                defaultValue={task?.dueDate ?? ""}
              />
            </label>
            <label>
              Status
              <select name="status" defaultValue={task?.status ?? "pending"}>
                <option value="pending">A fazer</option>
                <option value="progress">Em andamento</option>
                <option value="completed">Concluída</option>
              </select>
            </label>
          </div>
        </fieldset>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <footer className="dialog-footer">
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Salvando…" : task ? "Salvar alterações" : "Criar tarefa"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
