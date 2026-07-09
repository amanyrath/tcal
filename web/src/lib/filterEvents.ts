import type { CalendarEvent } from "../types/events";
import type { AppState } from "../types/state";
import { normalizeGroupId } from "./groupIds";

function parseHour(hhmm: string): number {
  return parseInt(hhmm.split(":")[0], 10);
}

function eventStartHour(event: CalendarEvent): number {
  return new Date(event.start).getHours();
}

function isFull(capacity: string | null): boolean {
  if (!capacity) return false;
  const lower = capacity.toLowerCase();
  return lower.includes("full") || lower.includes("waitlist");
}

export function filterEvents(events: CalendarEvent[], state: AppState): CalendarEvent[] {
  const activeGyms = new Set(state.activeGyms);
  const hiddenGroups = new Set(state.hiddenGroups);
  const offGroups = new Set(state.offGroups);
  const { preset, customStart, customEnd } = state.timeFilter;

  return events.filter((event) => {
    if (!activeGyms.has(event.gymKey)) return false;
    if (state.hideFull && isFull(event.capacity)) return false;

    const groupId = normalizeGroupId(event.categoryGroup);
    if (hiddenGroups.has(groupId)) return false;
    if (offGroups.has(groupId)) return false;

    const enabled = state.enabledTypes[groupId];
    if (enabled !== undefined) {
      if (enabled.length === 0) return false;
      if (!enabled.includes(event.displayName)) return false;
    }

    if (preset !== "all") {
      const hour = eventStartHour(event);
      if (preset === "morning" && hour >= 10) return false;
      if (preset === "midday" && (hour < 10 || hour >= 15)) return false;
      if (preset === "evening" && hour < 15) return false;
      if (preset === "custom") {
        const startH = parseHour(customStart);
        const endH = parseHour(customEnd);
        if (hour < startH || hour >= endH) return false;
      }
    }

    return true;
  });
}
