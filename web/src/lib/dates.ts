export function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfWeek(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return localDateString(d);
}

export function shiftWeek(start: string, deltaWeeks: number): string {
  const date = new Date(`${start}T12:00:00`);
  date.setDate(date.getDate() + deltaWeeks * 7);
  return localDateString(date);
}

export function goToToday(): string {
  return startOfWeek(new Date());
}

export function isToday(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compare = new Date(date);
  compare.setHours(0, 0, 0, 0);
  return compare.getTime() === today.getTime();
}

export function isPastDay(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compare = new Date(date);
  compare.setHours(0, 0, 0, 0);
  return compare < today;
}

export function formatWeekLabel(weekStart: string): string {
  const start = new Date(`${weekStart}T12:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} \u2013 ${fmt(end)}, ${end.getFullYear()}`;
}

export function shiftDay(dayStr: string, delta: number): string {
  const date = new Date(`${dayStr}T12:00:00`);
  date.setDate(date.getDate() + delta);
  return localDateString(date);
}

export function getWeekForDay(dayStr: string): string {
  const date = new Date(`${dayStr}T12:00:00`);
  return startOfWeek(date);
}

export function todayString(): string {
  return localDateString(new Date());
}

export function getDayOffset(dayStr: string, weekStart: string): number {
  const day = new Date(`${dayStr}T12:00:00`);
  const week = new Date(`${weekStart}T12:00:00`);
  return Math.round((day.getTime() - week.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatDayNavLabel(dayStr: string): string {
  const date = new Date(`${dayStr}T12:00:00`);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
