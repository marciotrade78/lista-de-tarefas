"use client";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Check,
  CheckCheck,
  Eye,
  EyeOff,
  LockKeyhole,
} from "lucide-react";

export default function LoginForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Não foi possível entrar.");
      window.location.assign("/");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Verifique sua conexão e tente novamente.",
      );
      setBusy(false);
    }
  }
  return (
    <main className="login-shell">
      <section className="login-story">
        <a className="brand" href="/" aria-label="TarefasPro, início">
          <span className="brand-mark">
            <CheckCheck />
          </span>
          TarefasPro
        </a>
        <div className="login-message">
          <span className="eyebrow">MENOS ESQUECIMENTOS. MAIS CLAREZA.</span>
          <h1>
            Um lugar para tudo
            <br />
            que você precisa fazer.
          </h1>
          <p>
            Organize seus compromissos e escolha o que merece sua atenção hoje.
          </p>
          <div className="login-benefit">
            <Check /> Tarefas pessoais e de trabalho
          </div>
          <div className="login-benefit">
            <Check /> Prioridades e prazos à vista
          </div>
          <div className="login-benefit">
            <Check /> No computador ou no celular
          </div>
        </div>
        <span className="login-foot">Um passo de cada vez.</span>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <span className="login-lock">
            <LockKeyhole size={25} />
          </span>
          <h2>Seu dia começa aqui</h2>
          <p>Entre para acessar suas tarefas.</p>
          <form onSubmit={submit} className="login-form">
            <label>
              E-mail
              <input
                type="email"
                name="email"
                autoComplete="username"
                placeholder="voce@exemplo.com"
                required
                maxLength={254}
                disabled={busy}
              />
            </label>
            <label>
              Senha
              <span className="password-input">
                <input
                  type={visible ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  required
                  maxLength={128}
                  disabled={busy}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
            {error && (
              <p role="alert" className="error-message">
                {error}
              </p>
            )}
            <button className="primary login-submit" disabled={busy}>
              {busy ? "Entrando…" : "Entrar"}
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="login-note">
            Para criar sua conta, use o link de convite que você recebeu. Para
            redefinir sua senha, procure o responsável pelo aplicativo.
          </p>
        </div>
      </section>
    </main>
  );
}
