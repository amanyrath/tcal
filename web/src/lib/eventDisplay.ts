import type { CalendarEvent } from "../types/events";
import { categoryStyle, type CategoryStyle } from "./colors";

export function formatClockTime(value: string): string {
  const time = value.split(" ")[1];
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours >= 12 ? "pm" : "am";
  const h = hours % 12 || 12;
  return `${h}:${minutes.toString().padStart(2, "0")}${suffix}`;
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatClockTime(start)} - ${formatClockTime(end)}`;
}

export function eventStyle(event: CalendarEvent): CategoryStyle {
  if (event.backgroundColor && event.textColor) {
    return {
      bg: event.backgroundColor,
      text: event.textColor,
      muted: event.textColor,
      border: event.backgroundColor,
    };
  }
  return categoryStyle(event.categoryGroup);
}
