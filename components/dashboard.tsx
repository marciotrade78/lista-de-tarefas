"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  Grid2X2,
  House,
  ListTodo,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Tag,
  UserRound,
  X,
} from "lucide-react";
import {
  categories as defaults,
  type PublicUser,
  type Task,
  type TaskInput,
} from "@/lib/types";
import { localDate } from "@/lib/dates";
import TaskDialog from "./task-dialog";
import DeleteDialog from "./delete-dialog";
import { TaskList } from "./task-list";
import {
  CalendarView,
  CategoriesView,
  Encouragement,
  ProgressCard,
  StatisticsView,
  Summary,
} from "./workspace-views";
import SettingsView, { type Preferences } from "./settings-view";
import WorkspaceDialog from "./workspace-dialog";

type Screen =
  | "home"
  | "tasks"
  | "calendar"
  | "statistics"
  | "categories"
  | "settings"
  | "more";
const screens = [
  { id: "home", label: "Início", Icon: House },
  { id: "tasks", label: "Minhas Tarefas", Icon: ListTodo },
  { id: "calendar", label: "Calendário", Icon: CalendarDays },
  { id: "statistics", label: "Estatísticas", Icon: BarChart3 },
  { id: "categories", label: "Categorias", Icon: Tag },
  { id: "settings", label: "Configurações", Icon: Settings },
] as const;
const initialPrefs: Preferences = {
  theme: "light",
  notifications: true,
  startView: "tasks",
};
async function api(path: string, options?: RequestInit) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
    cache: "no-store",
  });
  if (response.status === 401) {
    window.location.assign("/login");
    throw new Error("Sua sessão terminou. Entre novamente.");
  }
  const value = await response.json();
  if (!response.ok)
    throw new Error(value.error || "Não foi possível concluir a ação.");
  return value;
}
export default function Dashboard({ user: initialUser }: { user: PublicUser }) {
  const [user, setUser] = useState(initialUser),
    [tasks, setTasks] = useState<Task[]>([]),
    [loading, setLoading] = useState(true),
    [refreshing, setRefreshing] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [screen, setScreen] = useState<Screen>("tasks"),
    [filter, setFilter] = useState("all"),
    [category, setCategory] = useState(""),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState("date"),
    [page, setPage] = useState(1),
    [today, setToday] = useState("");
  const [names, setNames] = useState<string[]>([...defaults]),
    [preferences, setPreferences] = useState<Preferences>(initialPrefs),
    [workspaceReady, setWorkspaceReady] = useState(false);
  const [editor, setEditor] = useState<{
      task: Task | null;
      date?: string;
    } | null>(null),
    [deleting, setDeleting] = useState<Task | null>(null),
    [busy, setBusy] = useState(false),
    [signingOut, setSigningOut] = useState(false),
    [categoryOpen, setCategoryOpen] = useState(false),
    [categoryName, setCategoryName] = useState(""),
    [categoryError, setCategoryError] = useState(""),
    [notificationsOpen, setNotificationsOpen] = useState(false),
    [searchOpen, setSearchOpen] = useState(false);
  const mutationBusy = useRef(false),
    requestNumber = useRef(0);
  const load = useCallback(async () => {
    const number = ++requestNumber.current;
    setRefreshing(true);
    try {
      const data = await api("/api/tasks");
      if (number === requestNumber.current) {
        setTasks(data.tasks);
        setError("");
      }
    } catch (e) {
      if (number === requestNumber.current)
        setError(e instanceof Error ? e.message : "Verifique sua conexão.");
    } finally {
      if (number === requestNumber.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);
  useEffect(() => {
    void load();
    api("/api/workspace")
      .then((data) => {
        setNames(data.categories);
        setPreferences(data.preferences);
        setWorkspaceReady(true);
        if (!location.hash) setScreen(data.preferences.startView);
      })
      .catch((e) => setError(e.message));
  }, [load]);
  useEffect(() => {
    function update() {
      setToday(localDate());
    }
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    function sync() {
      const hash = location.hash.slice(1);
      if ([...screens.map((s) => s.id), "more"].includes(hash))
        setScreen(hash as Screen);
    }
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        preferences.theme === "auto"
          ? media.matches
            ? "dark"
            : "light"
          : preferences.theme;
    };
    apply();
    media.addEventListener("change", apply);
    return () => {
      media.removeEventListener("change", apply);
      delete document.documentElement.dataset.theme;
    };
  }, [preferences.theme]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    setPage(1);
  }, [query, category, filter, sort]);
  function navigate(next: Screen) {
    setScreen(next);
    location.hash = next;
    setSearchOpen(false);
  }
  function showTasks(nextFilter = "all", nextCategory = "") {
    setFilter(nextFilter);
    setCategory(nextCategory);
    setQuery("");
    navigate("tasks");
  }
  function create(date?: string) {
    setEditor({ task: null, date });
  }
  const filtered = useMemo(
    () =>
      tasks
        .filter(
          (t) =>
            (filter !== "pending" || t.status !== "completed") &&
            (filter !== "completed" || t.status === "completed") &&
            (filter !== "today" || t.dueDate === today) &&
            (!category || t.category === category) &&
            (!query ||
              [t.title, t.description, t.category]
                .join(" ")
                .toLocaleLowerCase("pt-BR")
                .includes(query.toLocaleLowerCase("pt-BR"))),
        )
        .sort((a, b) =>
          sort === "priority"
            ? { high: 0, medium: 1, low: 2 }[a.priority] -
              { high: 0, medium: 1, low: 2 }[b.priority]
            : sort === "created"
              ? b.createdAt - a.createdAt
              : (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
                (a.dueTime ?? "99").localeCompare(b.dueTime ?? "99") ||
                b.createdAt - a.createdAt,
        ),
    [tasks, filter, category, query, sort, today],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 20)),
    currentPage = Math.min(page, pageCount);
  const dueToday = tasks.filter(
    (t) => t.dueDate === today && t.status !== "completed",
  );
  const reminders = preferences.notifications
    ? tasks.filter(
        (t) =>
          t.reminder &&
          t.status !== "completed" &&
          t.dueDate &&
          t.dueDate <= today,
      )
    : [];
  async function save(input: TaskInput) {
    if (mutationBusy.current) throw new Error("Aguarde a ação atual terminar.");
    mutationBusy.current = true;
    setBusy(true);
    ++requestNumber.current;
    setRefreshing(false);
    try {
      const existing = editor?.task;
      const result = await api(
        existing ? "/api/tasks/" + existing.id : "/api/tasks",
        {
          method: existing ? "PUT" : "POST",
          body: JSON.stringify(
            existing ? { ...input, version: existing.version } : input,
          ),
        },
      );
      setTasks((current) =>
        existing
          ? current.map((t) => (t.id === existing.id ? result.task : t))
          : [result.task, ...current],
      );
      setNotice(existing ? "Alterações salvas." : "Tarefa criada.");
      setError("");
      if (input.status === "completed" && input.recurrence !== "none")
        void load();
    } finally {
      mutationBusy.current = false;
      setBusy(false);
    }
  }
  async function toggle(task: Task) {
    if (mutationBusy.current) return;
    mutationBusy.current = true;
    setBusy(true);
    ++requestNumber.current;
    setRefreshing(false);
    try {
      const { title, description, category, priority, dueDate, version } = task;
      const result = await api("/api/tasks/" + task.id, {
        method: "PUT",
        body: JSON.stringify({
          title,
          description,
          category,
          priority,
          dueDate,
          version,
          status: task.status === "completed" ? "pending" : "completed",
        }),
      });
      setTasks((current) =>
        current.map((t) => (t.id === task.id ? result.task : t)),
      );
      setNotice(
        task.status === "completed" ? "Tarefa reaberta." : "Tarefa concluída.",
      );
      if (task.recurrence && task.recurrence !== "none") void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível atualizar.");
    } finally {
      mutationBusy.current = false;
      setBusy(false);
    }
  }
  async function remove() {
    if (!deleting) return;
    if (mutationBusy.current) throw new Error("Aguarde a ação atual terminar.");
    mutationBusy.current = true;
    setBusy(true);
    ++requestNumber.current;
    try {
      await api("/api/tasks/" + deleting.id, {
        method: "DELETE",
        body: JSON.stringify({ version: deleting.version }),
      });
      setTasks((current) => current.filter((t) => t.id !== deleting.id));
      setNotice("Tarefa excluída.");
    } finally {
      mutationBusy.current = false;
      setBusy(false);
    }
  }
  async function logout() {
    setSigningOut(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
      location.assign("/login");
    } catch {
      setError("Não foi possível sair. Tente novamente.");
      setSigningOut(false);
    }
  }
  async function addCategory(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setCategoryError("");
    try {
      const result = await api("/api/workspace", {
        method: "POST",
        body: JSON.stringify({ name: categoryName }),
      });
      setNames((current) => [...current, result.name]);
      setCategoryOpen(false);
      setCategoryName("");
      setNotice("Categoria criada.");
    } catch (e) {
      setCategoryError(
        e instanceof Error ? e.message : "Não foi possível criar.",
      );
    } finally {
      setBusy(false);
    }
  }
  const taskListProps = {
    today,
    busy,
    onToggle: toggle,
    onEdit: (task: Task) => setEditor({ task }),
    onDelete: setDeleting,
    onCreate: () => create(),
  };
  const heading =
    screen === "home"
      ? "Olá, " + user.name.split(" ")[0] + " 👋"
      : screen === "more"
        ? "Mais"
        : screens.find((s) => s.id === screen)?.label;
  return (
    <div className="tp-app">
      <a className="skip-link" href="#main">
        Pular para o conteúdo
      </a>
      <aside className="tp-sidebar">
        <a className="tp-brand" href="#home" onClick={() => navigate("home")}>
          <span className="tp-logo">
            <Check size={23} />
          </span>
          TarefasPro
        </a>
        <nav aria-label="Navegação principal">
          {screens.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={screen === id ? "active" : ""}
              aria-current={screen === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={21} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="tp-sidebar-bottom">
          <Encouragement />
          <button className="tp-user" onClick={() => navigate("settings")}>
            <span className="avatar">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <span>
              <strong>{user.name}</strong>
              <small>Conta pessoal</small>
            </span>
            <ChevronRight size={17} />
          </button>
        </div>
      </aside>
      <div className="tp-main-shell">
        <header className="tp-topbar">
          <a
            className="tp-brand tp-mobile-brand"
            href="#home"
            onClick={() => navigate("home")}
          >
            <span className="tp-logo">
              <Check size={18} />
            </span>
            TarefasPro
          </a>
          <label className={"tp-search " + (searchOpen ? "is-open" : "")}>
            <Search size={18} />
            <input
              type="search"
              placeholder="Buscar tarefas, categorias…"
              aria-label="Buscar tarefas"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setScreen("tasks");
                setFilter("all");
                setCategory("");
              }}
            />
          </label>
          <div className="tp-topbar-actions">
            <button
              className="icon-button tp-mobile-search"
              aria-label="Abrir busca"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <Search size={20} />
            </button>
            <button
              className="icon-button tp-bell"
              aria-label="Lembretes"
              onClick={() => setNotificationsOpen(true)}
            >
              <Bell size={21} />
              {reminders.length > 0 && <i />}
            </button>
            <button
              className="tp-user"
              onClick={() => navigate("settings")}
              aria-label="Abrir perfil"
            >
              <span className="avatar">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="tp-topbar-name">{user.name}</span>
              <ChevronRight className="tp-topbar-name" size={15} />
            </button>
          </div>
        </header>
        <main id="main" className="tp-main">
          <div className="tp-page-heading">
            <div>
              <h1>{heading}</h1>
              <p>
                {screen === "home"
                  ? "Vamos tornar hoje um grande dia!"
                  : screen === "tasks"
                    ? "Organize seu dia, conquiste seus objetivos."
                    : screen === "calendar"
                      ? "Visualize suas tarefas no tempo."
                      : screen === "categories"
                        ? "Gerencie suas categorias e organize melhor suas tarefas."
                        : screen === "statistics"
                          ? "Cada passo conta. Acompanhe suas conquistas."
                          : ""}
              </p>
              {screen === "home" && today && (
                <small className="tp-today">
                  {new Intl.DateTimeFormat("pt-BR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  }).format(new Date(today + "T12:00:00"))}
                </small>
              )}
            </div>
            {["tasks", "home"].includes(screen) && (
              <button
                className="primary tp-new"
                aria-label="Nova tarefa"
                disabled={loading || busy}
                onClick={() => create()}
              >
                <Plus size={21} />
                <span>Nova Tarefa</span>
              </button>
            )}
            {screen === "categories" && (
              <button
                className="primary tp-new"
                aria-label="Nova categoria"
                disabled={!workspaceReady || busy}
                onClick={() => setCategoryOpen(true)}
              >
                <Plus size={21} />
                <span>Nova Categoria</span>
              </button>
            )}
          </div>
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button disabled={busy || refreshing} onClick={load}>
                Atualizar lista
              </button>
            </div>
          )}
          {loading ? (
            <div className="tp-empty" role="status">
              <RefreshCw className="spin" />
              <p>Carregando suas tarefas…</p>
            </div>
          ) : (
            <>
              {screen === "home" && (
                <>
                  <Summary tasks={tasks} onFilter={showTasks} />
                  <div className="tp-home-grid">
                    <section>
                      <div className="tp-section-heading">
                        <h2>Tarefas de hoje</h2>
                        <button
                          className="text-button"
                          onClick={() => showTasks("today")}
                        >
                          Ver todas
                          <ArrowRight size={15} />
                        </button>
                      </div>
                      <TaskList
                        {...taskListProps}
                        tasks={dueToday.slice(0, 5)}
                        compact
                      />
                    </section>
                    <aside>
                      <ProgressCard tasks={tasks} />
                      <Encouragement />
                    </aside>
                  </div>
                </>
              )}
              {screen === "tasks" && (
                <>
                  <div className="tp-list-tools">
                    <div className="tp-tabs" aria-label="Filtrar tarefas">
                      {[
                        ["all", "Todas"],
                        ["today", "Hoje"],
                        ["pending", "Pendentes"],
                        ["completed", "Concluídas"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          className={filter === value ? "active" : ""}
                          aria-pressed={filter === value}
                          onClick={() => setFilter(value)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <label className="tp-sort">
                      <span className="sr-only">Ordenar tarefas</span>
                      <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                      >
                        <option value="date">Ordenar por: Data</option>
                        <option value="priority">
                          Ordenar por: Prioridade
                        </option>
                        <option value="created">Mais recentes</option>
                      </select>
                    </label>
                  </div>
                  {category && (
                    <button
                      className="tp-category-filter"
                      onClick={() => setCategory("")}
                    >
                      {category}
                      <X size={15} />
                      Limpar filtro
                    </button>
                  )}
                  <TaskList
                    {...taskListProps}
                    tasks={filtered.slice(
                      (currentPage - 1) * 20,
                      currentPage * 20,
                    )}
                  />
                  <footer className="tp-list-footer">
                    <span>
                      Mostrando{" "}
                      {filtered.length
                        ? (currentPage - 1) * 20 +
                          1 +
                          "–" +
                          Math.min(currentPage * 20, filtered.length)
                        : 0}{" "}
                      de {filtered.length} tarefas
                    </span>
                    {pageCount > 1 && (
                      <div>
                        <button
                          className="text-button"
                          disabled={currentPage === 1}
                          onClick={() => setPage(currentPage - 1)}
                        >
                          Anterior
                        </button>
                        <span>
                          {currentPage}/{pageCount}
                        </span>
                        <button
                          className="text-button"
                          disabled={currentPage === pageCount}
                          onClick={() => setPage(currentPage + 1)}
                        >
                          Próxima
                        </button>
                      </div>
                    )}
                  </footer>
                  <div className="tp-mobile-quote">
                    “Pequenas ações, grandes resultados.” 🌱
                  </div>
                </>
              )}
              {screen === "calendar" && today && (
                <CalendarView
                  tasks={tasks}
                  today={today}
                  onEdit={(task) => setEditor({ task })}
                  onCreate={create}
                />
              )}
              {screen === "statistics" && (
                <StatisticsView tasks={tasks} today={today} />
              )}
              {screen === "categories" && (
                <CategoriesView
                  names={names}
                  tasks={tasks}
                  onSelect={(name) => showTasks("all", name)}
                  onCreate={() => setCategoryOpen(true)}
                />
              )}
              {screen === "settings" &&
                (workspaceReady ? (
                  <SettingsView
                    user={user}
                    tasks={tasks}
                    preferences={preferences}
                    onLogout={logout}
                    busy={signingOut}
                    onSave={async (data) => {
                      const result = await api("/api/workspace", {
                        method: "PUT",
                        body: JSON.stringify(data),
                      });
                      setUser(result.user);
                      setPreferences({
                        theme: data.theme,
                        notifications: data.notifications,
                        startView: data.startView,
                      });
                    }}
                  />
                ) : (
                  <p role="status">Carregando configurações…</p>
                ))}
              {screen === "more" && (
                <div className="tp-more">
                  {screens
                    .filter((s) =>
                      ["categories", "settings", "statistics"].includes(s.id),
                    )
                    .map(({ id, label, Icon }) => (
                      <button key={id} onClick={() => navigate(id)}>
                        <span>
                          <Icon size={22} />
                          {label}
                        </span>
                        <ChevronRight size={18} />
                      </button>
                    ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
      <nav className="tp-bottom-nav" aria-label="Navegação móvel">
        {[
          { id: "home", label: "Início", Icon: House },
          { id: "tasks", label: "Tarefas", Icon: ListTodo },
          { id: "calendar", label: "Calendário", Icon: CalendarDays },
          { id: "more", label: "Mais", Icon: Grid2X2 },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            className={
              screen === id ||
              (id === "more" && ["categories", "settings"].includes(screen))
                ? "active"
                : ""
            }
            onClick={() => navigate(id as Screen)}
          >
            <Icon size={21} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {notice && (
        <div className="tp-toast" role="status">
          <CheckCheck size={20} />
          {notice}
          <button
            className="icon-button"
            aria-label="Fechar aviso"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {editor && (
        <TaskDialog
          task={editor.task}
          initialDate={editor.date}
          categories={names}
          onClose={() => setEditor(null)}
          onSave={save}
          onDelete={() => {
            setDeleting(editor.task);
            setEditor(null);
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          task={deleting}
          onClose={() => setDeleting(null)}
          onDelete={remove}
        />
      )}
      {categoryOpen && (
        <WorkspaceDialog
          title="Nova categoria"
          busy={busy}
          onClose={() => setCategoryOpen(false)}
        >
          <form onSubmit={addCategory}>
            <label>
              Nome da categoria
              <input
                autoFocus
                required
                maxLength={40}
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Ex.: Projetos"
              />
            </label>
            {categoryError && (
              <p className="error-message" role="alert">
                {categoryError}
              </p>
            )}
            <footer className="dialog-footer">
              <button className="primary" disabled={busy}>
                {busy ? "Salvando…" : "Criar categoria"}
              </button>
            </footer>
          </form>
        </WorkspaceDialog>
      )}
      {notificationsOpen && (
        <WorkspaceDialog
          title="Lembretes"
          onClose={() => setNotificationsOpen(false)}
        >
          <p className="tp-help-text">Tarefas com lembrete e prazo até hoje.</p>
          {reminders.length ? (
            <ul className="tp-reminders">
              {reminders.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => {
                      setNotificationsOpen(false);
                      setEditor({ task: t });
                    }}
                  >
                    <Bell size={17} />
                    <span>
                      {t.title}
                      <small>
                        {t.dueDate?.split("-").reverse().join("/")}
                        {t.dueTime ? " · " + t.dueTime : ""}
                      </small>
                    </span>
                    <ChevronRight size={17} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="tp-empty">
              <Bell size={30} />
              <p>
                {preferences.notifications
                  ? "Tudo em dia. Nenhum lembrete pendente."
                  : "Os lembretes estão desativados nas configurações."}
              </p>
            </div>
          )}
        </WorkspaceDialog>
      )}
    </div>
  );
}
