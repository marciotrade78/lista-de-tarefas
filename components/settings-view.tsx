"use client";
import { useState } from "react";
import {
  Bell,
  ChevronRight,
  Cloud,
  Download,
  HelpCircle,
  Info,
  LogOut,
  Palette,
  Settings2,
  UserRound,
  ArrowLeft,
} from "lucide-react";
import type { PublicUser, Task } from "@/lib/types";
export type Preferences = {
  theme: "light" | "dark" | "auto";
  notifications: boolean;
  startView: "home" | "tasks" | "calendar";
};
const panels = [
  { id: "profile", name: "Perfil", Icon: UserRound },
  { id: "theme", name: "Tema", Icon: Palette },
  { id: "notifications", name: "Notificações", Icon: Bell },
  { id: "preferences", name: "Preferências", Icon: Settings2 },
  { id: "sync", name: "Backup e sincronização", Icon: Cloud },
  { id: "export", name: "Exportar dados", Icon: Download },
  { id: "help", name: "Ajuda e suporte", Icon: HelpCircle },
  { id: "about", name: "Sobre o app", Icon: Info },
];
export default function SettingsView({
  user,
  preferences,
  tasks,
  onSave,
  onLogout,
  busy,
}: {
  user: PublicUser;
  preferences: Preferences;
  tasks: Task[];
  onSave: (
    data: Preferences & { name: string; email: string },
  ) => Promise<void>;
  onLogout: () => void;
  busy: boolean;
}) {
  const [panel, setPanel] = useState("profile"),
    [expanded, setExpanded] = useState(false),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [saved, setSaved] = useState(false);
  const [name, setName] = useState(user.name),
    [email, setEmail] = useState(user.email),
    [prefs, setPrefs] = useState(preferences);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await onSave({ ...prefs, name, email });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }
  function exportData() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            profile: user,
            preferences,
            tasks,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "tarefaspro-backup.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className={"tp-settings " + (expanded ? "detail-open" : "")}>
      <aside className="tp-settings-menu">
        <button
          className="tp-profile-card"
          onClick={() => {
            setPanel("profile");
            setExpanded(true);
          }}
        >
          <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
          <span>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
            <em>Editar perfil</em>
          </span>
        </button>
        <nav aria-label="Configurações">
          {panels.map(({ id, name, Icon }) => (
            <button
              key={id}
              className={panel === id ? "active" : ""}
              onClick={() => {
                setPanel(id);
                setExpanded(true);
                setSaved(false);
              }}
            >
              <Icon size={19} />
              <span>{name}</span>
              <ChevronRight size={15} />
            </button>
          ))}
        </nav>
        <button className="tp-signout" onClick={onLogout} disabled={busy}>
          <LogOut size={17} />
          {busy ? "Saindo…" : "Sair da conta"}
        </button>
      </aside>
      <section className="tp-settings-detail">
        <button
          className="text-button tp-settings-back"
          onClick={() => setExpanded(false)}
        >
          <ArrowLeft size={18} />
          Configurações
        </button>
        <h2>{panels.find((p) => p.id === panel)?.name}</h2>
        <form onSubmit={submit}>
          <fieldset disabled={saving}>
            {panel === "profile" && (
              <>
                <div className="tp-profile-preview">
                  <span className="avatar">
                    {name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <strong>{name}</strong>
                    <p>{email}</p>
                  </div>
                </div>
                <label>
                  Nome
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={80}
                    autoComplete="name"
                  />
                </label>
                <label>
                  E-mail
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={254}
                    autoComplete="email"
                  />
                </label>
              </>
            )}
            {(panel === "theme" || panel === "profile") && (
              <label>
                Tema
                <select
                  value={prefs.theme}
                  onChange={(e) =>
                    setPrefs({
                      ...prefs,
                      theme: e.target.value as Preferences["theme"],
                    })
                  }
                >
                  <option value="light">Claro</option>
                  <option value="dark">Escuro</option>
                  <option value="auto">Automático</option>
                </select>
              </label>
            )}
            {panel === "notifications" && (
              <>
                <label className="tp-switch-row">
                  <span>
                    Lembretes no aplicativo
                    <small>
                      Veja tarefas com lembrete no sino do cabeçalho.
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    checked={prefs.notifications}
                    onChange={(e) =>
                      setPrefs({ ...prefs, notifications: e.target.checked })
                    }
                  />
                </label>
                <p className="tp-help-text">
                  Os lembretes ficam disponíveis ao abrir o aplicativo. Não são
                  enviadas notificações com o aplicativo fechado.
                </p>
              </>
            )}
            {panel === "preferences" && (
              <label>
                Tela inicial
                <select
                  value={prefs.startView}
                  onChange={(e) =>
                    setPrefs({
                      ...prefs,
                      startView: e.target.value as Preferences["startView"],
                    })
                  }
                >
                  <option value="home">Início</option>
                  <option value="tasks">Minhas Tarefas</option>
                  <option value="calendar">Calendário</option>
                </select>
              </label>
            )}
            {panel === "sync" && (
              <div className="tp-info-content">
                <Cloud size={36} />
                <h3>Suas tarefas, sempre com você</h3>
                <p>
                  As alterações são salvas na sua conta ao confirmar cada ação.
                  Entre com o mesmo e-mail em outro dispositivo para acessar
                  suas tarefas.
                </p>
                <p>
                  É necessária uma conexão com a internet. Você também pode
                  baixar uma cópia em Exportar dados.
                </p>
              </div>
            )}
            {panel === "export" && (
              <div className="tp-info-content">
                <Download size={36} />
                <h3>Uma cópia dos seus dados</h3>
                <p>
                  Baixe suas {tasks.length} tarefas, subtarefas e preferências
                  em um arquivo JSON.
                </p>
                <button className="primary" type="button" onClick={exportData}>
                  <Download size={17} />
                  Exportar dados
                </button>
              </div>
            )}
            {panel === "help" && (
              <div className="tp-help-content">
                <details open>
                  <summary>Como criar e editar tarefas?</summary>
                  <p>
                    Toque em + para criar. Toque no título de uma tarefa para
                    editar seus detalhes, horário e subtarefas.
                  </p>
                </details>
                <details>
                  <summary>Como funciona a repetição?</summary>
                  <p>
                    Ao concluir uma tarefa recorrente com prazo, a próxima
                    ocorrência é criada automaticamente. A repetição mensal usa
                    o último dia disponível quando necessário.
                  </p>
                </details>
                <details>
                  <summary>Como usar o calendário?</summary>
                  <p>
                    Selecione uma data para ver a agenda. Os pontos indicam dias
                    com tarefas. Use as setas para mudar de mês.
                  </p>
                </details>
                <details>
                  <summary>Como acompanhar resultados?</summary>
                  <p>
                    Em Estatísticas, alterne entre semana, mês e ano. O gráfico
                    considera as conclusões com data registrada nesta versão.
                  </p>
                </details>
              </div>
            )}
            {panel === "about" && (
              <div className="tp-info-content">
                <span className="tp-logo">✓</span>
                <h3>TarefasPro</h3>
                <p>Organize seu dia, conquiste seus objetivos.</p>
                <p>
                  Versão 2.0 · Seu espaço pessoal para tarefas, categorias e
                  compromissos.
                </p>
              </div>
            )}
            {["profile", "theme", "notifications", "preferences"].includes(
              panel,
            ) && (
              <button className="primary tp-save-settings" disabled={saving}>
                {saving ? "Salvando…" : "Salvar alterações"}
              </button>
            )}
          </fieldset>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          {saved && (
            <p className="tp-success" role="status">
              Alterações salvas.
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
