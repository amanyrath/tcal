import type { CategoryGroup, EventsResponse } from "../types/events";
import type { AppState } from "../types/state";
import { startOfWeek } from "./dates";
import { HOME_GYM, DEFAULT_GYM_ORDER } from "./gyms";

export const DEFAULT_HIDDEN_GROUPS: string[] = [];

export function buildEnabledTypes(catalog: CategoryGroup[]): Record<string, string[]> {
  const hidden = new Set(DEFAULT_HIDDEN_GROUPS);
  const enabledTypes: Record<string, string[]> = {};

  for (const group of catalog) {
    if (hidden.has(group.id) || group.types.length === 0) continue;
    enabledTypes[group.id] = group.types.map((type) => type.displayName);
  }

  return enabledTypes;
}

export function syncEnabledTypes(
  current: Record<string, string[]>,
  catalog: CategoryGroup[],
): Record<string, string[]> {
  return syncEnabledTypesWithCatalog(current, catalog, DEFAULT_HIDDEN_GROUPS, []);
}

export function syncEnabledTypesWithCatalog(
  current: Record<string, string[]>,
  catalog: CategoryGroup[],
  hiddenGroups: string[],
  offGroups: string[],
): Record<string, string[]> {
  const hidden = new Set([...DEFAULT_HIDDEN_GROUPS, ...hiddenGroups]);
  const off = new Set(offGroups);
  const next: Record<string, string[]> = {};

  for (const group of catalog) {
    const catalogNames = group.types.map((type) => type.displayName);
    if (catalogNames.length === 0) continue;

    const visibleNames = new Set(catalogNames);
    const existing = current[group.id] ?? [];
    const pruned = existing.filter((name) => visibleNames.has(name));
    const skipAutoEnable = hidden.has(group.id) || off.has(group.id);

    if (skipAutoEnable) {
      next[group.id] = pruned;
      continue;
    }

    if (pruned.length === 0) {
      next[group.id] = catalogNames;
      continue;
    }

    const merged = [...pruned];
    const known = new Set(pruned);
    for (const name of catalogNames) {
      if (!known.has(name)) {
        merged.push(name);
        known.add(name);
      }
    }
    next[group.id] = merged;
  }

  return next;
}

export function createDefaultState(data?: EventsResponse, catalog?: CategoryGroup[]): AppState {
  const resolvedCatalog = catalog ?? data?.categoryGroups ?? [];
  return {
    homeGym: HOME_GYM,
    activeGyms: [HOME_GYM],
    gymOrder: [...DEFAULT_GYM_ORDER],
    enabledTypes: resolvedCatalog.length > 0 ? buildEnabledTypes(resolvedCatalog) : {},
    hiddenGroups: [...DEFAULT_HIDDEN_GROUPS],
    offGroups: [],
    hideFull: false,
    timeFilter: {
      preset: "all" as const,
      customStart: "06:00",
      customEnd: "21:00",
    },
    collapsedSections: {
      gyms: false,
      time: false,
      categories: false,
      hidden: true,
    },
    filterPanelOpen: true,
    view: "week",
    weekStart: startOfWeek(),
  };
}
