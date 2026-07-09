import { isPastDay, isToday } from "./dates";

export function formatDayHeader(date: Date): { weekday: string; date: string } {
  return {
    weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
    date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  };
}

export function getDayColumnStyle(day: Date): { backgroundColor: string } {
  if (isToday(day)) {
    return { backgroundColor: "var(--cal-today-bg)" };
  }
  if (isPastDay(day)) {
    return { backgroundColor: "var(--cal-past-bg)" };
  }
  return { backgroundColor: "#ffffff" };
}
