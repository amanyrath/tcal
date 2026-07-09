import type { AppState } from "../types/state";

export function buildExportUrl(state: AppState, baseUrl = ""): string {
  const params = new URLSearchParams();

  if (state.activeGyms.length > 0) {
    params.set("gym", state.activeGyms.join(","));
  }

  // Send the canonical event_type value so the backend's substring match on
  // event.event_type lines up. URLSearchParams encodes spaces as "+", which
  // parse_qs decodes back to spaces; a literal "+" would encode to "%2B" and
  // break the match, so we must not pre-slugify spaces into "+".
  const types = new Set<string>();
  for (const groupId of Object.keys(state.enabledTypes)) {
    if (state.hiddenGroups.includes(groupId) || state.offGroups.includes(groupId)) {
      continue;
    }
    for (const eventType of state.enabledTypes[groupId] ?? []) {
      types.add(eventType.toLowerCase());
    }
  }

  if (types.size > 0) {
    params.set("type", Array.from(types).join(","));
  }

  const query = params.toString();
  return `${baseUrl}/calendar.ics${query ? `?${query}` : ""}`;
}

export function buildGoogleCalendarUrl(icsUrl: string): string {
  const webcal = icsUrl.replace(/^https?:\/\//, "webcal://");
  return `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`;
}
