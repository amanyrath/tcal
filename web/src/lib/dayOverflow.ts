import type { CalendarEvent } from "../types/events";

export const MAX_VISIBLE_EVENTS = 8;

export function sliceEventsForDisplay(
  events: CalendarEvent[],
  expanded: boolean,
): { visible: CalendarEvent[]; remaining: number } {
  if (expanded || events.length <= MAX_VISIBLE_EVENTS) {
    return { visible: events, remaining: 0 };
  }
  return {
    visible: events.slice(0, MAX_VISIBLE_EVENTS),
    remaining: events.length - MAX_VISIBLE_EVENTS,
  };
}
