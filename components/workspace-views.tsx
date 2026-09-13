"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Heart,
  House,
  Plane,
  Plus,
  Sprout,
  Tag,
  Wallet,
  Users,
} from "lucide-react";
import type { Task } from "@/lib/types";
import { localDate } from "@/lib/dates";
import { CategoryBadge, categoryTone } from "./task-list";
const icons: Record<string, typeof House> = {
  Trabalho: BriefcaseBusiness,
  Pessoal: House,
  Estudos: BookOpen,
  Saúde: Heart,
  Finanças: Wallet,
  Viagem: Plane,
  Casa: House,
  Família: Users,
};
export function CategoryIcon({ name }: { name: string }) {
  const Icon = icons[name] ?? Tag;
  return (
    <span className={"tp-category-icon " + categoryTone(name)}>
      <Icon size={23} />
    </span>
  );
}
export function Summary({
  tasks,
  onFilter,
}: {
  tasks: Task[];
  onFilter: (filter: string) => void;
}) {
  const done = tasks.filter((t) => t.status === "completed").length;
  return (
    <div className="tp-summary">
      {[
        {
          name: "Pendentes",
          value: tasks.length - done,
          Icon: Clock3,
          tone: "rose",
          filter: "pending",
        },
        {
          name: "Concluídas",
          value: done,
          Icon: Check,
          tone: "mint",
          filter: "completed",
        },
        {
          name: "Total",
          value: tasks.length,
          Icon: CalendarDays,
          tone: "sky",
          filter: "all",
        },
        {
          name: "Conclusão",
          value:
            (tasks.length ? Math.round((done / tasks.length) * 100) : 0) + "%",
          Icon: ArrowUpRight,
          tone: "sky",
          filter: "all",
        },
      ].map(({ name, value, Icon, tone, filter }) => (
        <button
          key={name}
          className={"tp-summary-card " + tone}
          onClick={() => onFilter(filter)}
        >
          <span className="tp-summary-icon">
            <Icon size={20} />
          </span>
          <span>
            <strong>{value}</strong>
            <small>{name}</small>
          </span>
        </button>
      ))}
    </div>
  );
}
export function ProgressCard({ tasks }: { tasks: Task[] }) {
  const done = tasks.filter((t) => t.status === "completed").length;
  const percentage = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  return (
    <section className="tp-panel tp-progress">
      <div>
        <h3>Seu progresso</h3>
        <strong>{percentage}%</strong>
      </div>
      <progress
        value={percentage}
        max={100}
        aria-label="Percentual de tarefas concluídas"
      />
      <p>
        {done} de {tasks.length} tarefas concluídas
      </p>
    </section>
  );
}
export function Encouragement() {
  return (
    <div className="tp-encouragement">
      <Sprout size={35} />
      <p>
        Disciplina hoje,
        <br />
        <strong>resultados amanhã.</strong>
      </p>
    </div>
  );
}
export function CalendarView({
  tasks,
  today,
  onEdit,
  onCreate,
}: {
  tasks: Task[];
  today: string;
  onEdit: (task: Task) => void;
  onCreate: (date: string) => void;
}) {
  const [month, setMonth] = useState(
    () => new Date((today || localDate()) + "T12:00:00"),
  );
  const [selected, setSelected] = useState(today || localDate());
  const year = month.getFullYear(),
    m = month.getMonth(),
    first = new Date(year, m, 1).getDay(),
    count = new Date(year, m + 1, 0).getDate();
  const days = Array.from(
    { length: Math.ceil((first + count) / 7) * 7 },
    (_, i) => i - first + 1,
  );
  const selectedTasks = tasks
    .filter((t) => t.dueDate === selected)
    .sort((a, b) => (a.dueTime ?? "99").localeCompare(b.dueTime ?? "99"));
  const dateKey = (day: number) =>
    year +
    "-" +
    String(m + 1).padStart(2, "0") +
    "-" +
    String(day).padStart(2, "0");
  const monthLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(month);
  return (
    <div className="tp-calendar-layout">
      <section className="tp-panel tp-calendar">
        <div className="tp-calendar-heading">
          <h2>{monthLabel}</h2>
          <div>
            <button
              className="text-button"
              onClick={() => {
                setMonth(new Date(today + "T12:00:00"));
                setSelected(today);
              }}
            >
              Hoje
            </button>
            <button
              className="icon-button"
              aria-label="Mês anterior"
              onClick={() => setMonth(new Date(year, m - 1, 1))}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="icon-button"
              aria-label="Próximo mês"
              onClick={() => setMonth(new Date(year, m + 1, 1))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <div className="tp-calendar-grid">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
            <span key={d} className="tp-weekday">
              {d}
            </span>
          ))}
          {days.map((d, i) =>
            d < 1 || d > count ? (
              <span key={"blank" + i} />
            ) : (
              <button
                key={d}
                className={
                  (dateKey(d) === selected ? "selected " : "") +
                  (dateKey(d) === today ? "today" : "")
                }
                aria-label={d + " de " + monthLabel}
                aria-pressed={dateKey(d) === selected}
                onClick={() => setSelected(dateKey(d))}
              >
                <span>{d}</span>
                {tasks.some((t) => t.dueDate === dateKey(d)) && <i />}
              </button>
            ),
          )}
        </div>
      </section>
      <section className="tp-panel tp-agenda">
        <h2>Tarefas do dia</h2>
        <p>
          {new Intl.DateTimeFormat("pt-BR", {
            day: "numeric",
            month: "long",
          }).format(new Date(selected + "T12:00:00"))}
        </p>
        {selectedTasks.length ? (
          <ul>
            {selectedTasks.map((t) => (
              <li key={t.id}>
                <button onClick={() => onEdit(t)}>
                  <span
                    className={"tp-event-dot " + categoryTone(t.category)}
                  />
                  <div>
                    <strong>{t.title}</strong>
                    <small>
                      {t.dueTime || "Sem horário"}
                      {t.status === "completed" ? " · Concluída" : ""}
                    </small>
                  </div>
                  <CategoryBadge name={t.category} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="tp-agenda-empty">
            <CalendarDays size={28} />
            <p>Nenhuma tarefa para este dia.</p>
            <button className="text-button" onClick={() => onCreate(selected)}>
              Adicionar tarefa
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
export function CategoriesView({
  names,
  tasks,
  onSelect,
  onCreate,
}: {
  names: string[];
  tasks: Task[];
  onSelect: (name: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="tp-categories">
      {names.map((name) => (
        <button
          key={name}
          className="tp-category-card"
          onClick={() => onSelect(name)}
        >
          <CategoryIcon name={name} />
          <span>
            <strong>{name}</strong>
            <small>
              {tasks.filter((t) => t.category === name).length} tarefas
            </small>
          </span>
          <ChevronRight size={18} />
        </button>
      ))}
      <button className="tp-category-add" onClick={onCreate}>
        <Plus size={23} />
        Adicionar categoria
      </button>
    </div>
  );
}
export function StatisticsView({
  tasks,
  today,
}: {
  tasks: Task[];
  today: string;
}) {
  const [period, setPeriod] = useState("week");
  const end = new Date((today || localDate()) + "T23:59:59"),
    days = period === "week" ? 7 : period === "month" ? 30 : 365;
  const start = new Date(end);
  start.setDate(end.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);
  const completed = tasks.filter(
    (t) =>
      t.status === "completed" &&
      t.completedAt &&
      t.completedAt >= start.getTime() &&
      t.completedAt <= end.getTime(),
  );
  const pending = tasks.filter(
    (t) =>
      t.status !== "completed" &&
      t.dueDate &&
      t.dueDate >= localDate(start) &&
      t.dueDate <= (today || localDate()),
  );
  const total = completed.length + pending.length,
    percent = total ? Math.round((completed.length / total) * 100) : 0;
  const minutes = [...completed, ...pending].reduce(
    (sum, t) => sum + (t.estimatedMinutes ?? 0),
    0,
  );
  const buckets = period === "week" ? 7 : period === "month" ? 6 : 12;
  const points = Array.from({ length: buckets }, (_, i) => {
    const from =
        start.getTime() + ((end.getTime() - start.getTime() + 1) * i) / buckets,
      to =
        start.getTime() +
        ((end.getTime() - start.getTime() + 1) * (i + 1)) / buckets;
    return completed.filter(
      (t) => t.completedAt! >= from && t.completedAt! < to,
    ).length;
  });
  const max = Math.max(1, ...points),
    coords = points.map(
      (n, i) => 25 + (i * 450) / (buckets - 1) + "," + (165 - (n / max) * 130),
    );
  const counts = [...new Set(tasks.map((t) => t.category))]
    .map((name) => ({
      name,
      count: tasks.filter((t) => t.category === name).length,
    }))
    .sort((a, b) => b.count - a.count);
  const colors = [
    "#ff5964",
    "#24c696",
    "#ffbf32",
    "#8565f2",
    "#1794ff",
    "#20bed0",
    "#8b97a9",
    "#d77de5",
  ];
  let sum = 0;
  const segments = counts.map((c, i) => {
    const begin = sum;
    sum += (c.count / Math.max(tasks.length, 1)) * 100;
    return colors[i % colors.length] + " " + begin + "% " + sum + "%";
  });
  return (
    <>
      <div
        className="tp-stats-tabs tp-tabs"
        aria-label="Período das estatísticas"
      >
        {[
          ["week", "Semana"],
          ["month", "Mês"],
          ["year", "Ano"],
        ].map(([v, label]) => (
          <button
            key={v}
            className={period === v ? "active" : ""}
            aria-pressed={period === v}
            onClick={() => setPeriod(v)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="tp-period-caption">
        Resumo do período · {days} dias até hoje
      </p>
      <div className="tp-summary tp-stat-summary">
        {[
          {
            name: "Concluídas",
            value: completed.length,
            tone: "mint",
            Icon: Check,
          },
          {
            name: "Pendentes com prazo",
            value: pending.length,
            tone: "rose",
            Icon: Clock3,
          },
          {
            name: "Taxa de conclusão",
            value: percent + "%",
            tone: "sky",
            Icon: CalendarDays,
          },
          {
            name: "Tempo estimado",
            value: Math.round((minutes / 60) * 10) / 10 + "h",
            tone: "violet",
            Icon: Clock3,
          },
        ].map(({ name, value, tone, Icon }) => (
          <div key={name} className={"tp-summary-card " + tone}>
            <span className="tp-summary-icon">
              <Icon size={20} />
            </span>
            <span>
              <strong>{value}</strong>
              <small>{name}</small>
            </span>
          </div>
        ))}
      </div>
      <div className="tp-charts">
        <section className="tp-panel">
          <h2>Conclusões no período</h2>
          <p className="tp-chart-note">Tarefas concluídas por intervalo</p>
          <svg
            className="tp-line-chart"
            viewBox="0 0 500 205"
            role="img"
            aria-label={"Conclusões por intervalo: " + points.join(", ")}
          >
            <defs>
              <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                <stop stopColor="#0877ff" stopOpacity=".2" />
                <stop offset="1" stopColor="#0877ff" stopOpacity=".01" />
              </linearGradient>
            </defs>
            {[0, 0.5, 1].map((n) => (
              <g key={n}>
                <line
                  x1="25"
                  x2="475"
                  y1={165 - n * 130}
                  y2={165 - n * 130}
                  stroke="#e8eef6"
                />
                <text x="2" y={169 - n * 130} fill="#637591" fontSize="10">
                  {Math.round(max * n)}
                </text>
              </g>
            ))}
            <path
              d={"M25,165 L" + coords.join(" L") + " L475,165 Z"}
              fill="url(#chart-fill)"
            />
            <polyline
              points={coords.join(" ")}
              fill="none"
              stroke="#0675ff"
              strokeWidth="3"
            />
            {coords.map((p, i) => (
              <circle
                key={i}
                cx={p.split(",")[0]}
                cy={p.split(",")[1]}
                r="4.5"
                fill="#0675ff"
                stroke="white"
                strokeWidth="2"
              />
            ))}
            <text x="25" y="195" fontSize="11" fill="#637591">
              {localDate(start).split("-").reverse().join("/")}
            </text>
            <text x="445" y="195" fontSize="11" fill="#637591">
              Hoje
            </text>
          </svg>
          <p className="tp-chart-note">
            Histórico registrado a partir desta versão. Conclusões anteriores
            sem data não entram no gráfico.
          </p>
        </section>
        <section className="tp-panel">
          <h2>Tarefas por categoria</h2>
          <p className="tp-chart-note">Todas as tarefas da sua conta</p>
          <div className="tp-donut-layout">
            <div
              className="tp-donut"
              role="img"
              aria-label={tasks.length + " tarefas por categoria"}
              style={{
                background: segments.length
                  ? "conic-gradient(" + segments.join(",") + ")"
                  : "#e9eef6",
              }}
            >
              <div>
                <strong>{tasks.length}</strong>
                <span>tarefas</span>
              </div>
            </div>
            <ul>
              {counts.map((c, i) => (
                <li key={c.name}>
                  <i style={{ background: colors[i % colors.length] }} />
                  <span>{c.name}</span>
                  <strong>{Math.round((c.count / tasks.length) * 100)}%</strong>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </>
  );
}
