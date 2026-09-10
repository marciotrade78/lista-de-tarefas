"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownWideNarrow,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  Circle,
  CircleCheck,
  Clock3,
  Flag,
  House,
  LayoutList,
  ListTodo,
  LogOut,
  Menu,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  categories,
  type PublicUser,
  type Task,
  type TaskInput,
} from "@/lib/types";
import { dayLabel, localDate } from "@/lib/dates";
import TaskDialog from "./task-dialog";
import DeleteDialog from "./delete-dialog";

type View = "all" | "today" | "upcoming" | "completed" | "overdue";
const viewNames: Record<View, string> = {
  all: "Minhas tarefas",
  today: "Meu dia",
  upcoming: "Próximos dias",
  completed: "Concluídas",
  overdue: "Tarefas atrasadas",
};
const categoryIcons = {
  Pessoal: House,
  Trabalho: BriefcaseBusiness,
  Família: Users,
  Estudos: BookOpen,
};
const priorityNames = { low: "Baixa", medium: "Média", high: "Alta" };
const statusNames = {
  pending: "A fazer",
  progress: "Em andamento",
  completed: "Concluída",
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

export default function Dashboard({ user }: { user: PublicUser }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [view, setView] = useState<View>("all");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("due");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [editor, setEditor] = useState<{ task: Task | null } | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [busyTask, setBusyTask] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [today, setToday] = useState("");
  const requestNumber = useRef(0);
  const mutationBusy = useRef(false);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    const number = ++requestNumber.current;
    setRefreshing(true);
    try {
      const data = await api("/api/tasks");
      if (number === requestNumber.current) {
        setTasks(data.tasks);
        setError("");
      }
    } catch (error) {
      if (number === requestNumber.current)
        setError(
          error instanceof Error ? error.message : "Verifique sua conexão.",
        );
    } finally {
      if (number === requestNumber.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const updateDate = () => setToday(localDate());
    updateDate();
    const interval = setInterval(updateDate, 30000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    setPage(1);
  }, [view, category, query, priority, status, sort]);

  const pending = tasks.filter((task) => task.status !== "completed");
  const completed = tasks.length - pending.length;
  const dueToday = pending.filter((task) => task.dueDate === today);
  const overdue = pending.filter(
    (task) => task.dueDate && task.dueDate < today,
  );
  const completion = tasks.length
    ? Math.round((completed / tasks.length) * 100)
    : 0;
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return tasks
      .filter((task) => {
        if (view === "all" && task.status === "completed") return false;
        if (
          view === "today" &&
          (task.dueDate !== today || task.status === "completed")
        )
          return false;
        if (
          view === "upcoming" &&
          (!task.dueDate ||
            task.dueDate <= today ||
            task.status === "completed")
        )
          return false;
        if (view === "completed" && task.status !== "completed") return false;
        if (
          view === "overdue" &&
          (!task.dueDate ||
            task.dueDate >= today ||
            task.status === "completed")
        )
          return false;
        return (
          (!category || task.category === category) &&
          (!priority || task.priority === priority) &&
          (!status || task.status === status) &&
          (!normalized ||
            `${task.title} ${task.description}`
              .toLocaleLowerCase("pt-BR")
              .includes(normalized))
        );
      })
      .sort((a, b) => {
        if (sort === "recent") return b.createdAt - a.createdAt;
        if (sort === "priority") {
          const ranks = { high: 0, medium: 1, low: 2 };
          const difference = ranks[a.priority] - ranks[b.priority];
          if (difference) return difference;
        }
        return (
          (a.dueDate ?? "9999-99-99").localeCompare(
            b.dueDate ?? "9999-99-99",
          ) || b.createdAt - a.createdAt
        );
      });
  }, [tasks, view, today, category, priority, status, query, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * 20, currentPage * 20);
  const preview = [...dueToday]
    .sort(
      (a, b) =>
        ({ high: 0, medium: 1, low: 2 })[a.priority] -
        { high: 0, medium: 1, low: 2 }[b.priority],
    )
    .slice(0, 3);
  function selectView(next: View, nextCategory = "") {
    setView(next);
    setCategory(nextCategory);
    setPriority("");
    setStatus("");
    setQuery("");
    setMobileNav(false);
  }
  async function save(input: TaskInput) {
    if (mutationBusy.current) throw new Error("Aguarde a ação atual terminar.");
    mutationBusy.current = true;
    ++requestNumber.current;
    setRefreshing(false);
    try {
      const existing = editor?.task;
      const result = await api(
        existing ? `/api/tasks/${existing.id}` : "/api/tasks",
        {
          method: existing ? "PUT" : "POST",
          body: JSON.stringify(
            existing ? { ...input, version: existing.version } : input,
          ),
        },
      );
      setTasks((current) =>
        existing
          ? current.map((task) =>
              task.id === existing.id ? result.task : task,
            )
          : [result.task, ...current],
      );
      setNotice(existing ? "Alterações salvas." : "Tarefa criada.");
      setError("");
    } finally {
      mutationBusy.current = false;
    }
  }
  async function toggle(task: Task) {
    if (mutationBusy.current) return;
    mutationBusy.current = true;
    setBusyTask(task.id);
    setError("");
    ++requestNumber.current;
    setRefreshing(false);
    const { title, description, category, priority, dueDate, version } = task;
    try {
      const result = await api(`/api/tasks/${task.id}`, {
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
        current.map((item) => (item.id === task.id ? result.task : item)),
      );
      setNotice(
        task.status === "completed" ? "Tarefa reaberta." : "Tarefa concluída.",
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Não foi possível atualizar.",
      );
    } finally {
      mutationBusy.current = false;
      setBusyTask(null);
    }
  }
  async function remove() {
    if (!deleting) return;
    if (mutationBusy.current) throw new Error("Aguarde a ação atual terminar.");
    mutationBusy.current = true;
    ++requestNumber.current;
    setRefreshing(false);
    try {
      await api(`/api/tasks/${deleting.id}`, {
        method: "DELETE",
        body: JSON.stringify({ version: deleting.version }),
      });
      setTasks((current) => current.filter((task) => task.id !== deleting.id));
      setNotice("Tarefa excluída.");
      setError("");
    } finally {
      mutationBusy.current = false;
    }
  }
  async function logout() {
    setSigningOut(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
      window.location.assign("/login");
    } catch {
      setError("Não foi possível sair. Tente novamente.");
      setSigningOut(false);
    }
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Pular para as tarefas
      </a>
      {mobileNav && (
        <button
          className="nav-overlay"
          onClick={() => setMobileNav(false)}
          aria-label="Fechar menu"
        />
      )}
      <aside
        className={`sidebar ${mobileNav ? "is-open" : ""}`}
        aria-label="Navegação principal"
      >
        <div className="sidebar-brand">
          <a href="/" className="brand">
            <span className="brand-mark">
              <CheckCheck />
            </span>
            em dia<span className="brand-dot">.</span>
          </a>
          <button
            className="icon-button mobile-close"
            aria-label="Fechar menu"
            onClick={() => setMobileNav(false)}
          >
            <X />
          </button>
        </div>
        <div className="workspace-label">SEU ESPAÇO PESSOAL</div>
        <nav className="main-nav">
          <button
            className={view === "all" && !category ? "active" : ""}
            onClick={() => selectView("all")}
          >
            <LayoutList size={20} />
            <span>Minhas tarefas</span>
            <span className="nav-count">{pending.length}</span>
          </button>
          <button
            className={view === "today" ? "active" : ""}
            onClick={() => selectView("today")}
          >
            <CalendarDays size={20} />
            <span>Meu dia</span>
            {dueToday.length > 0 && (
              <span className="nav-count">{dueToday.length}</span>
            )}
          </button>
          <button
            className={view === "upcoming" ? "active" : ""}
            onClick={() => selectView("upcoming")}
          >
            <Clock3 size={20} />
            <span>Próximos dias</span>
          </button>
          <button
            className={view === "completed" ? "active" : ""}
            onClick={() => selectView("completed")}
          >
            <CircleCheck size={20} />
            <span>Concluídas</span>
            <span className="nav-count">{completed}</span>
          </button>
          <button
            className={view === "overdue" ? "active" : ""}
            onClick={() => selectView("overdue")}
          >
            <Flag size={20} />
            <span>Atrasadas</span>
            {overdue.length > 0 && (
              <span className="nav-count">{overdue.length}</span>
            )}
          </button>
        </nav>
        <div className="workspace-label category-heading">CATEGORIAS</div>
        <nav className="category-nav">
          {categories.map((item) => {
            const Icon = categoryIcons[item];
            return (
              <button
                key={item}
                className={category === item ? "active" : ""}
                onClick={() => selectView("all", item)}
              >
                <Icon size={18} />
                <span>{item}</span>
                <span className="category-count">
                  {pending.filter((task) => task.category === item).length}
                </span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-progress">
            <div>
              <span>Seu progresso</span>
              <strong>{completion}%</strong>
            </div>
            <progress
              value={completion}
              max={100}
              aria-label="Percentual de tarefas concluídas"
            />
            <p>
              {completed} de {tasks.length} tarefas concluídas
            </p>
          </div>
          <div className="profile">
            <span className="avatar">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{user.name}</strong>
              <span>Conta pessoal</span>
            </div>
            <button
              className="icon-button"
              title="Sair da conta"
              aria-label="Sair da conta"
              onClick={logout}
              disabled={signingOut}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          {searchOpen ? (
            <div className="topbar-search">
              <Search size={18} />
              <input
                type="search"
                autoFocus
                placeholder="Buscar tarefa…"
                aria-label="Buscar tarefas"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <button
                className="icon-button"
                aria-label="Fechar busca"
                onClick={() => {
                  setSearchOpen(false);
                  setQuery("");
                }}
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <>
              <div className="breadcrumb">
                <button
                  className="icon-button mobile-menu"
                  aria-label="Abrir menu"
                  aria-expanded={mobileNav}
                  onClick={() => setMobileNav(true)}
                >
                  <Menu />
                </button>
                <span>Meu espaço</span>
                <ChevronRight size={15} />
                <strong>{category || viewNames[view]}</strong>
              </div>
              <div className="topbar-right">
                <span className="today-label">
                  {today &&
                    new Intl.DateTimeFormat("pt-BR", {
                      weekday: "short",
                      day: "numeric",
                      month: "long",
                    }).format(new Date(`${today}T12:00:00`))}
                </span>
                <button
                  className="icon-button"
                  aria-label="Buscar tarefas"
                  onClick={() => setSearchOpen(true)}
                >
                  <Search size={18} />
                </button>
                <span className="avatar small">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
              </div>
            </>
          )}
        </header>
        <main id="main" className="main-content">
          <div className="content-grid">
            <section className="task-surface" aria-label="Lista de tarefas">
              <div className="toolbar-card">
                <div className="surface-heading">
                  <div>
                    <h2>
                      {category ? `Tarefas · ${category}` : viewNames[view]}
                    </h2>
                    <span>
                      {filtered.length}{" "}
                      {filtered.length === 1 ? "tarefa" : "tarefas"}
                    </span>
                  </div>
                  <button
                    className="icon-button"
                    title="Atualizar lista"
                    aria-label="Atualizar lista"
                    disabled={
                      refreshing || !!busyTask || !!editor || !!deleting
                    }
                    onClick={load}
                  >
                    <RefreshCw size={18} className={refreshing ? "spin" : ""} />
                  </button>
                </div>
                <div className="list-toolbar">
                  <button
                    className={`filter-button ${filtersOpen || priority || status ? "selected" : ""}`}
                    aria-expanded={filtersOpen}
                    onClick={() => setFiltersOpen(!filtersOpen)}
                  >
                    <SlidersHorizontal size={17} />
                    <span>Filtros</span>
                    {(priority || status) && (
                      <span className="filter-indicator" />
                    )}
                  </button>
                  <label className="sort-control" title="Ordenar tarefas">
                    <ArrowDownWideNarrow size={18} />
                    <select
                      aria-label="Ordenar tarefas"
                      value={sort}
                      onChange={(event) => setSort(event.target.value)}
                    >
                      <option value="due">Prazo</option>
                      <option value="priority">Prioridade</option>
                      <option value="recent">Recentes</option>
                    </select>
                  </label>
                </div>
                {filtersOpen && (
                  <div className="filter-panel">
                    <label>
                      Prioridade
                      <select
                        value={priority}
                        onChange={(event) => setPriority(event.target.value)}
                      >
                        <option value="">Todas</option>
                        <option value="high">Alta</option>
                        <option value="medium">Média</option>
                        <option value="low">Baixa</option>
                      </select>
                    </label>
                    <label>
                      Status
                      <select
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
                      >
                        <option value="">Todos desta lista</option>
                        <option value="pending">A fazer</option>
                        <option value="progress">Em andamento</option>
                        <option value="completed">Concluídas</option>
                      </select>
                    </label>
                    <button
                      className="text-button"
                      onClick={() => {
                        setStatus("");
                        setPriority("");
                        setQuery("");
                      }}
                    >
                      Limpar filtros
                    </button>
                  </div>
                )}
                {error && (
                  <div className="error-banner" role="alert">
                    <span>{error}</span>
                    <button onClick={load} disabled={refreshing || !!busyTask}>
                      Atualizar lista
                    </button>
                  </div>
                )}
              </div>
              {loading ? (
                <div className="empty-state" role="status">
                  <div className="loading-ring" />
                  <h3>Buscando suas tarefas…</h3>
                </div>
              ) : visible.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">
                    {view === "completed" ? (
                      <CheckCheck size={29} />
                    ) : (
                      <ListTodo size={29} />
                    )}
                  </span>
                  <h3>
                    {query || priority || status
                      ? "Nenhuma tarefa com esses filtros"
                      : view === "today"
                        ? "Seu dia está livre por aqui"
                        : view === "overdue"
                          ? "Nenhuma tarefa atrasada"
                          : view === "completed"
                            ? "Cada tarefa concluída conta"
                            : "Espaço livre para seus próximos passos"}
                  </h3>
                  <p>
                    {query || priority || status
                      ? "Ajuste os filtros ou tente outra busca."
                      : view === "completed"
                        ? "As tarefas que você concluir aparecerão aqui."
                        : "Adicione uma tarefa e tire esse compromisso da cabeça."}
                  </p>
                  {view !== "completed" && (
                    <button
                      className="secondary"
                      onClick={() => setEditor({ task: null })}
                    >
                      <Plus size={17} />
                      Criar tarefa
                    </button>
                  )}
                </div>
              ) : (
                <ul className="task-list">
                  {visible.map((task) => {
                    const late =
                      task.status !== "completed" &&
                      task.dueDate &&
                      task.dueDate < today;
                    const Icon = categoryIcons[task.category];
                    return (
                      <li
                        key={task.id}
                        className={`task-row ${task.status === "completed" ? "done" : ""}`}
                      >
                        <button
                          className={`task-check ${task.status === "completed" ? "checked" : ""}`}
                          disabled={!!busyTask}
                          aria-label={`${task.status === "completed" ? "Reabrir" : "Concluir"} tarefa: ${task.title}`}
                          onClick={() => toggle(task)}
                        >
                          {busyTask === task.id ? (
                            <RefreshCw size={16} className="spin" />
                          ) : task.status === "completed" ? (
                            <Check size={16} />
                          ) : null}
                        </button>
                        <div className="task-body">
                          <button
                            className="task-title"
                            onClick={() => setEditor({ task })}
                            disabled={!!busyTask}
                          >
                            {task.title}
                          </button>
                          {task.description && (
                            <p className="task-description">
                              {task.description}
                            </p>
                          )}
                          <div className="task-meta">
                            <span>
                              <Icon size={13} />
                              {task.category}
                            </span>
                            <span
                              className={`due-label ${late ? "late" : task.dueDate === today ? "today" : ""}`}
                            >
                              <CalendarDays size={13} />
                              {task.dueDate
                                ? `${dayLabel(task.dueDate, today)}${late ? " · atrasada" : ""}`
                                : "Sem prazo"}
                            </span>
                            {task.status === "progress" && (
                              <span className="progress-label">
                                <Clock3 size={13} />
                                {statusNames[task.status]}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`priority-badge ${task.priority}`}>
                          <span />
                          {priorityNames[task.priority]}
                        </span>
                        <div className="row-actions">
                          <button
                            className="icon-button"
                            aria-label={`Editar tarefa: ${task.title}`}
                            title="Editar"
                            onClick={() => setEditor({ task })}
                            disabled={!!busyTask}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="icon-button delete-button"
                            aria-label={`Excluir tarefa: ${task.title}`}
                            title="Excluir"
                            onClick={() => setDeleting(task)}
                            disabled={!!busyTask}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {!loading && (
                <footer className="list-footer">
                  <span>
                    {filtered.length
                      ? `${(currentPage - 1) * 20 + 1}–${Math.min(currentPage * 20, filtered.length)} de ${filtered.length} tarefas`
                      : "Tudo organizado em um só lugar"}
                  </span>
                  {pageCount > 1 ? (
                    <div className="pagination">
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
                  ) : (
                    <span>
                      Marque <Circle size={12} /> para concluir
                    </span>
                  )}
                </footer>
              )}
            </section>
            <aside className="right-column">
              <section className="focus-card">
                <div className="focus-heading">
                  <span className="focus-icon">
                    <CalendarDays size={21} />
                  </span>
                  <span>FOCO DE HOJE</span>
                </div>
                <h2>
                  {loading
                    ? "Seu dia, com clareza."
                    : dueToday.length
                      ? `${dueToday.length} ${dueToday.length === 1 ? "tarefa para hoje" : "tarefas para hoje"}.`
                      : "Dê espaço ao que importa."}
                </h2>
                <p>
                  {dueToday.length
                    ? "Um compromisso de cada vez. Comece pelo mais importante."
                    : "Defina o prazo de uma tarefa para incluí-la no seu dia."}
                </p>
                {preview.length > 0 && (
                  <ul className="focus-list">
                    {preview.map((task) => (
                      <li key={task.id}>
                        <button
                          onClick={() => setEditor({ task })}
                          disabled={!!busyTask}
                        >
                          <span className={`focus-dot ${task.priority}`} />
                          {task.title}
                          <ChevronRight size={15} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  className="focus-link"
                  onClick={() => selectView("today")}
                >
                  Ver meu dia
                  <ArrowRight size={17} />
                </button>
              </section>
              <section className="progress-card">
                <div className="section-label">
                  <h2>Passos dados</h2>
                  <CheckCheck size={19} />
                </div>
                <div className="completion-number">
                  {completion}
                  <span>%</span>
                </div>
                <progress
                  value={completion}
                  max={100}
                  aria-label="Progresso total"
                />
                <p>
                  <strong>
                    {completed}{" "}
                    {completed === 1
                      ? "tarefa concluída"
                      : "tarefas concluídas"}
                  </strong>{" "}
                  de {tasks.length} no total.
                </p>
              </section>
              <section className="tip-card">
                <span className="tip-rule" />
                <p>
                  Você não precisa fazer tudo hoje.
                  <br />
                  <strong>Só precisa saber por onde começar.</strong>
                </p>
              </section>
            </aside>
          </div>
          <footer className="app-footer">
            <span>em dia.</span>
            <span>Seu tempo, melhor organizado.</span>
          </footer>
        </main>
      </div>
      <button
        className="fab"
        aria-label="Nova tarefa"
        title="Nova tarefa"
        onClick={() => setEditor({ task: null })}
        disabled={loading || !!busyTask}
      >
        <Plus size={26} />
      </button>
      {notice && (
        <div className="toast" role="status">
          <CircleCheck size={19} />
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
          onClose={() => setEditor(null)}
          onSave={save}
        />
      )}
      {deleting && (
        <DeleteDialog
          task={deleting}
          onClose={() => setDeleting(null)}
          onDelete={remove}
        />
      )}
    </div>
  );
}
