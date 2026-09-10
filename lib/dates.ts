export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function dayLabel(value: string, today: string) {
  if (value === today) return "Hoje";
  const tomorrow = new Date(`${today}T12:00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (value === localDate(tomorrow)) return "Amanhã";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    ...(value.slice(0, 4) !== today.slice(0, 4)
      ? { year: "numeric" as const }
      : {}),
  }).format(new Date(`${value}T12:00:00`));
}
