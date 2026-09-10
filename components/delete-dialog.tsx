"use client";
import { useEffect, useRef, useState } from "react";
import type { Task } from "@/lib/types";
export default function DeleteDialog({
  task,
  onClose,
  onDelete,
}: {
  task: Task;
  onClose: () => void;
  onDelete: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    cancel.current?.focus();
    return () => el?.close();
  }, []);
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await onDelete();
      onClose();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Não foi possível excluir.",
      );
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="task-dialog small-dialog"
      aria-labelledby="delete-title"
      aria-describedby="delete-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <h2 id="delete-title">Excluir esta tarefa?</h2>
      <p id="delete-description">
        “{task.title}” será excluída permanentemente.
      </p>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <footer className="dialog-footer">
        <button
          ref={cancel}
          className="secondary"
          disabled={busy}
          onClick={onClose}
        >
          Cancelar
        </button>
        <button className="danger" disabled={busy} onClick={remove}>
          {busy ? "Excluindo…" : "Excluir tarefa"}
        </button>
      </footer>
    </dialog>
  );
}
