import type { AppState } from "../types/state";

export function stateToSearchParams(state: AppState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.activeGyms.length > 0) {
    params.set("gym", state.activeGyms.join(","));
  }

  const onParts: string[] = [];
  for (const [groupId, types] of Object.entries(state.enabledTypes)) {
    if (state.offGroups.includes(groupId) || state.hiddenGroups.includes(groupId)) {
      continue;
    }
    if (types.length > 0) {
      onParts.push(`${groupId}:${types.map((t) => t.toLowerCase().replace(/\s+/g, "-")).join(",")}`);
    } else {
      onParts.push(groupId);
    }
  }
  if (onParts.length > 0) {
    params.set("on", onParts.join(";"));
  }

  if (state.hiddenGroups.length > 0) {
    params.set("hidden", state.hiddenGroups.join(","));
  }
  if (state.offGroups.length > 0) {
    params.set("off", state.offGroups.join(","));
  }

  return params;
}

export function applySearchParams(state: AppState, search: string): AppState {
  const params = new URLSearchParams(search);
  const next = { ...state };

  const gyms = params.get("gym");
  if (gyms) {
    next.activeGyms = gyms.split(",").filter(Boolean);
  }

  const on = params.get("on");
  if (on) {
    const enabledTypes = { ...next.enabledTypes };
    for (const part of on.split(";")) {
      const [groupId, typesRaw] = part.split(":");
      if (!groupId) continue;
      if (typesRaw) {
        enabledTypes[groupId] = typesRaw.split(",").map((slug) =>
          slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        );
      }
    }
    next.enabledTypes = enabledTypes;
  }

  const hidden = params.get("hidden");
  if (hidden) {
    next.hiddenGroups = hidden.split(",").filter(Boolean);
  }

  const off = params.get("off");
  if (off) {
    next.offGroups = off.split(",").filter(Boolean);
  }

  return next;
}
