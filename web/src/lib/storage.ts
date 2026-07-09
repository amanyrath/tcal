import type { AppState } from "../types/state";
import { STORAGE_KEY } from "../types/state";
import { createDefaultState } from "./defaults";
import { startOfWeek } from "./dates";
import { normalizeGroupId } from "./groupIds";
import { HOME_GYM, normalizeGymOrder } from "./gyms";

type PersistedState = Omit<AppState, "weekStart">;

function migrateGroupIdList(groupIds: string[]): string[] {
  return [...new Set(groupIds.map(normalizeGroupId))];
}

function migrateEnabledTypes(
  enabledTypes: Record<string, string[]>,
): Record<string, string[]> {
  const next: Record<string, string[]> = {};
  for (const [groupId, types] of Object.entries(enabledTypes)) {
    if (types.length === 0) continue;
    const migratedId = normalizeGroupId(groupId);
    next[migratedId] = [...(next[migratedId] ?? []), ...types];
  }
  return next;
}

function migratePersistedState(parsed: Partial<PersistedState>): Partial<PersistedState> {
  return {
    ...parsed,
    hiddenGroups: parsed.hiddenGroups
      ? migrateGroupIdList(parsed.hiddenGroups)
      : parsed.hiddenGroups,
    offGroups: parsed.offGroups ? migrateGroupIdList(parsed.offGroups) : parsed.offGroups,
    enabledTypes: parsed.enabledTypes
      ? migrateEnabledTypes(parsed.enabledTypes)
      : parsed.enabledTypes,
  };
}

export function loadState(fallback?: AppState): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = migratePersistedState(JSON.parse(raw) as Partial<PersistedState>);
    const defaults = createDefaultState();
    return {
      ...defaults,
      ...parsed,
      weekStart: startOfWeek(),
      enabledTypes: parsed.enabledTypes ?? defaults.enabledTypes,
      activeGyms:
        parsed.activeGyms && parsed.activeGyms.length > 0 ? parsed.activeGyms : [HOME_GYM],
      gymOrder: normalizeGymOrder(parsed.gymOrder ?? defaults.gymOrder),
    };
  } catch {
    return fallback ?? null;
  }
}

export function saveState(state: AppState): void {
  const { weekStart: _weekStart, ...persisted } = state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
}
