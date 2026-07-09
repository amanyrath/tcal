import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EventsResponse } from "../types/events";
import type { AppState, TimeFilter } from "../types/state";
import { buildCatalogFromEvents } from "../lib/buildCatalog";
import {
  createDefaultState,
  syncEnabledTypesWithCatalog,
} from "../lib/defaults";
import { goToToday, shiftWeek } from "../lib/dates";
import { HOME_GYM, moveGymToTop } from "../lib/gyms";
import { loadState, saveState } from "../lib/storage";
import { applySearchParams, stateToSearchParams } from "../lib/urlState";

export function useCalendarState(data: EventsResponse | null) {
  const initializedRef = useRef(false);
  const [state, setState] = useState<AppState>(() => {
    const stored = loadState();
    if (stored) return applySearchParams(stored, window.location.search);
    const activeGyms = [HOME_GYM];
    const catalog =
      data && activeGyms.length > 0
        ? buildCatalogFromEvents(
            data.events.filter((event) => activeGyms.includes(event.gymKey)),
            data.categoryGroups,
          )
        : undefined;
    return createDefaultState(data ?? undefined, catalog);
  });

  const gymScopedCatalog = useMemo(() => {
    if (!data || state.activeGyms.length === 0) return [];
    const active = new Set(state.activeGyms);
    return buildCatalogFromEvents(
      data.events.filter((event) => active.has(event.gymKey)),
      data.categoryGroups,
    );
  }, [data, state.activeGyms]);

  const weekScopedCatalog = useMemo(() => {
    if (!data || state.activeGyms.length === 0) return gymScopedCatalog;
    const active = new Set(state.activeGyms);
    const weekEnd = shiftWeek(state.weekStart, 1);
    const weekEvents = data.events.filter((event) => {
      if (!active.has(event.gymKey)) return false;
      const dateStr = event.start.slice(0, 10);
      return dateStr >= state.weekStart && dateStr < weekEnd;
    });
    const weekCatalog = buildCatalogFromEvents(weekEvents, data.categoryGroups);
    const weekCounts = new Map(
      weekCatalog.map((g) => [g.id, new Map(g.types.map((t) => [t.displayName, t.count]))]),
    );
    return gymScopedCatalog.map((group) => {
      const groupCounts = weekCounts.get(group.id);
      return {
        ...group,
        types: group.types.map((t) => ({
          ...t,
          count: groupCounts?.get(t.displayName) ?? 0,
        })),
        subgroups: group.subgroups?.map((sg) => ({
          ...sg,
          types: sg.types.map((t) => ({
            ...t,
            count: groupCounts?.get(t.displayName) ?? 0,
          })),
        })),
      };
    });
  }, [data, state.activeGyms, state.weekStart, gymScopedCatalog]);

  useEffect(() => {
    if (!data) return;

    const stored = loadState();
    if (!stored && !initializedRef.current) {
      initializedRef.current = true;
      setState(createDefaultState(data, gymScopedCatalog));
      return;
    }

    setState((prev) => {
      const enabledTypes = syncEnabledTypesWithCatalog(
        prev.enabledTypes,
        gymScopedCatalog,
        prev.hiddenGroups,
        prev.offGroups,
      );
      const catalogGroupIds = new Set(gymScopedCatalog.map((group) => group.id));
      const offGroups = prev.offGroups.filter((groupId) => catalogGroupIds.has(groupId));
      return { ...prev, enabledTypes, offGroups };
    });
  }, [data, gymScopedCatalog]);

  useEffect(() => {
    if (!data) return;
    const allowed = new Set(data.gyms.map((gym) => gym.key));
    setState((prev) => {
      const pruned = prev.activeGyms.filter((key) => allowed.has(key));
      if (pruned.length === prev.activeGyms.length) return prev;
      const fallback = allowed.has(prev.homeGym)
        ? [prev.homeGym]
        : data.gyms[0]
          ? [data.gyms[0].key]
          : [];
      return { ...prev, activeGyms: pruned.length > 0 ? pruned : fallback };
    });
  }, [data]);

  useEffect(() => {
    saveState(state);
    const params = stateToSearchParams(state);
    const next = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", next);
  }, [state]);

  const update = useCallback((patch: Partial<AppState> | ((prev: AppState) => AppState)) => {
    setState((prev) => (typeof patch === "function" ? patch(prev) : { ...prev, ...patch }));
  }, []);

  const toggleGym = useCallback((gymKey: string) => {
    setState((prev) => {
      const active = [...prev.activeGyms];
      const index = active.indexOf(gymKey);
      if (index >= 0) {
        active.splice(index, 1);
        return { ...prev, activeGyms: active };
      }

      active.unshift(gymKey);
      return {
        ...prev,
        activeGyms: active,
        gymOrder: moveGymToTop(prev.gymOrder, gymKey),
      };
    });
  }, []);

  const toggleGroup = useCallback((groupId: string, on: boolean) => {
    setState((prev) => {
      const offGroups = new Set(prev.offGroups);
      const hiddenGroups = new Set(prev.hiddenGroups);
      if (on) {
        offGroups.delete(groupId);
        hiddenGroups.delete(groupId);
      } else {
        offGroups.add(groupId);
      }
      return {
        ...prev,
        offGroups: Array.from(offGroups),
        hiddenGroups: Array.from(hiddenGroups),
      };
    });
  }, []);

  const hideGroup = useCallback((groupId: string) => {
    setState((prev) => ({
      ...prev,
      hiddenGroups: Array.from(new Set([...prev.hiddenGroups, groupId])),
      offGroups: prev.offGroups.filter((id) => id !== groupId),
    }));
  }, []);

  const unhideGroup = useCallback((groupId: string) => {
    setState((prev) => ({
      ...prev,
      hiddenGroups: prev.hiddenGroups.filter((id) => id !== groupId),
      offGroups: Array.from(new Set([...prev.offGroups, groupId])),
    }));
  }, []);

  const toggleType = useCallback((groupId: string, displayName: string, enabled: boolean) => {
    setState((prev) => {
      const current = new Set(prev.enabledTypes[groupId] ?? []);
      if (enabled) current.add(displayName);
      else current.delete(displayName);
      return {
        ...prev,
        enabledTypes: { ...prev.enabledTypes, [groupId]: Array.from(current) },
        offGroups: prev.offGroups.filter((id) => id !== groupId),
      };
    });
  }, []);

  const setGroupTypes = useCallback((groupId: string, displayNames: string[]) => {
    setState((prev) => {
      const offGroups = new Set(prev.offGroups);
      if (displayNames.length > 0) {
        offGroups.delete(groupId);
      } else {
        offGroups.add(groupId);
      }
      return {
        ...prev,
        enabledTypes: { ...prev.enabledTypes, [groupId]: displayNames },
        offGroups: Array.from(offGroups),
      };
    });
  }, []);

  const toggleHideFull = useCallback(() => {
    update((prev) => ({ ...prev, hideFull: !prev.hideFull }));
  }, [update]);

  const setTimeFilter = useCallback((patch: Partial<TimeFilter>) => {
    update((prev) => ({
      ...prev,
      timeFilter: { ...prev.timeFilter, ...patch },
    }));
  }, [update]);

  const actions = useMemo(
    () => ({
      toggleGym,
      toggleGroup,
      hideGroup,
      unhideGroup,
      toggleType,
      setGroupTypes,
      setTimeFilter,
      toggleHideFull,
      prevWeek: () => update((prev) => ({ ...prev, weekStart: shiftWeek(prev.weekStart, -1) })),
      nextWeek: () => update((prev) => ({ ...prev, weekStart: shiftWeek(prev.weekStart, 1) })),
      goToToday: () => update((prev) => ({ ...prev, weekStart: goToToday() })),
      toggleFilterPanel: () => update((prev) => ({ ...prev, filterPanelOpen: !prev.filterPanelOpen })),
      toggleSection: (section: keyof AppState["collapsedSections"]) =>
        update((prev) => ({
          ...prev,
          collapsedSections: {
            ...prev.collapsedSections,
            [section]: !prev.collapsedSections[section],
          },
        })),
    }),
    [hideGroup, setGroupTypes, setTimeFilter, toggleGroup, toggleGym, toggleHideFull, toggleType, unhideGroup, update],
  );

  return { state, update, actions, gymScopedCatalog, weekScopedCatalog };
}
