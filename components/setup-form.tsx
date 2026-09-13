"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCheck, LockKeyhole } from "lucide-react";

export default function SetupForm() {
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const value =
      new URLSearchParams(window.location.hash.slice(1)).get("chave") || "";
    if (value) setToken(value);
    setReady(true);
    // Fragments are not sent to the server. Remove the key from the address bar as well.
    if (value) window.history.replaceState(null, "", window.location.pathname);
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    if (data.get("password") !== data.get("confirmation")) {
      setError("As senhas não coincidem.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: data.get("name"),
          email: data.get("email"),
          password: data.get("password"),
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Não foi possível criar sua conta.");
      setDone(true);
      setToken("");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Verifique sua conexão e tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="center-screen">
      <section className="setup-card">
        <Link className="brand" href="/login">
          <span className="brand-mark">
            <CheckCheck />
          </span>
          TarefasPro
        </Link>
        {done ? (
          <>
            <h1>Sua conta está pronta</h1>
            <p>As tabelas foram criadas e seu acesso está configurado.</p>
            <Link href="/login" className="primary">
              Entrar na minha conta
            </Link>
          </>
        ) : (
          <>
            <span className="login-lock">
              <LockKeyhole size={25} />
            </span>
            <h1>Crie seu acesso</h1>
            <p>
              Escolha o e-mail e a senha que usará para entrar na sua lista de
              tarefas.
            </p>
            {!ready ? (
              <p role="status">Preparando configuração…</p>
            ) : !token ? (
              <p className="error-message" role="alert">
                Abra o link de configuração enviado nesta conversa. Ele contém
                sua chave de acesso inicial.
              </p>
            ) : (
              <form onSubmit={submit} className="login-form">
                <fieldset disabled={busy}>
                  <label>
                    Seu nome
                    <input
                      name="name"
                      autoComplete="name"
                      required
                      maxLength={80}
                    />
                  </label>
                  <label>
                    E-mail
                    <input
                      name="email"
                      type="email"
                      autoComplete="username"
                      required
                      maxLength={254}
                    />
                  </label>
                  <label>
                    Senha
                    <input
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={12}
                      maxLength={128}
                    />
                    <span className="optional">
                      Use de 12 a 128 caracteres.
                    </span>
                  </label>
                  <label>
                    Repita a senha
                    <input
                      name="confirmation"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={12}
                      maxLength={128}
                    />
                  </label>
                  <button className="primary" disabled={busy}>
                    {busy ? "Criando sua conta…" : "Criar minha conta"}
                  </button>
                </fieldset>
                {error && (
                  <p className="error-message" role="alert">
                    {error}
                  </p>
                )}
              </form>
            )}
            <p className="login-note">
              Esta configuração pode ser concluída uma única vez.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
