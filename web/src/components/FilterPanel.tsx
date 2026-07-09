import { useEffect, useRef, useState } from "react";
import type { CategoryGroup } from "../types/events";
import type { AppState, TimeFilter, TimeFilterPreset } from "../types/state";
import { mergeSubgroups, hasSubgroupStructure } from "../lib/categories";
import { VISIBLE_GROUP_IDS } from "../lib/groupIds";
import { gymsGroupedByRegion } from "../lib/gyms";

interface FilterPanelProps {
  state: AppState;
  categoryGroups: CategoryGroup[];
  allowedGymKeys?: string[];
  onToggleGym: (gymKey: string) => void;
  onSetGroupTypes: (groupId: string, displayNames: string[]) => void;
  onHideGroup: (groupId: string) => void;
  onUnhideGroup: (groupId: string) => void;
  onToggleType: (groupId: string, displayName: string, enabled: boolean) => void;
  onToggleSection: (section: keyof AppState["collapsedSections"]) => void;
  onSetTimeFilter: (patch: Partial<TimeFilter>) => void;
  onToggleHideFull: () => void;
  onClose?: () => void;
}

export function FilterPanel({
  state,
  categoryGroups,
  allowedGymKeys,
  onToggleGym,
  onSetGroupTypes,
  onHideGroup,
  onUnhideGroup,
  onToggleType,
  onToggleSection,
  onSetTimeFilter,
  onToggleHideFull,
  onClose,
}: FilterPanelProps) {
  const activeGyms = new Set(state.activeGyms);
  const allowed = allowedGymKeys ? new Set(allowedGymKeys) : null;
  const gymRegions = gymsGroupedByRegion(state.gymOrder)
    .map(({ region, gyms }) => ({
      region,
      gyms: allowed ? gyms.filter((gym) => allowed.has(gym.key)) : gyms,
    }))
    .filter(({ gyms }) => gyms.length > 0);
  const hiddenSet = new Set(state.hiddenGroups);
  const offSet = new Set(state.offGroups);

  const visibleGroups = categoryGroups.filter(
    (group) =>
      VISIBLE_GROUP_IDS.has(group.id) &&
      !hiddenSet.has(group.id) &&
      group.types.length > 0,
  );
  const hiddenGroups = categoryGroups.filter(
    (group) => hiddenSet.has(group.id) && group.types.length > 0,
  );

  return (
    <aside className="flex flex-col h-full bg-white border-r border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800">Filters</h2>
        {onClose && (
          <button type="button" onClick={onClose} className="md:hidden text-gray-500 text-sm">
            Close
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto text-sm">
        <div className="border-b border-gray-100 px-3 py-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={state.hideFull}
              onChange={onToggleHideFull}
            />
            <span className="font-medium text-gray-700">Hide full classes</span>
          </label>
        </div>

        <Section
          title="Gyms"
          collapsed={state.collapsedSections.gyms}
          onToggle={() => onToggleSection("gyms")}
        >
          <div className="space-y-3">
            {gymRegions.map(({ region, gyms }) => (
              <div key={region.id}>
                <div className="text-xs font-medium text-gray-500 px-1 py-0.5">{region.label}</div>
                <ul className="space-y-1">
                  {gyms.map((gym) => (
                    <li key={gym.key}>
                      <label className="flex items-center gap-2 px-1 py-0.5 cursor-pointer hover:bg-gray-50 rounded">
                        <input
                          type="checkbox"
                          checked={activeGyms.has(gym.key)}
                          onChange={() => onToggleGym(gym.key)}
                        />
                        <span className="flex-1 truncate">{gym.shortName}</span>
                        {gym.key === state.homeGym && (
                          <span className="text-[10px] uppercase tracking-wide text-gray-400">Home</span>
                        )}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Time of Day"
          collapsed={state.collapsedSections.time}
          onToggle={() => onToggleSection("time")}
        >
          <TimeFilterSection
            timeFilter={state.timeFilter}
            onSetTimeFilter={onSetTimeFilter}
          />
        </Section>

        <Section
          title="Class Categories"
          collapsed={state.collapsedSections.categories}
          onToggle={() => onToggleSection("categories")}
        >
          <div className="space-y-3">
            {visibleGroups.length === 0 ? (
              <p className="text-gray-400 px-1">No categories available</p>
            ) : (
              visibleGroups.map((group) => {
              const isOn = !offSet.has(group.id);
              return (
                <CategoryGroupSection
                  key={group.id}
                  group={group}
                  isOn={isOn}
                  enabledTypes={new Set(state.enabledTypes[group.id] ?? [])}
                  onSetGroupTypes={(names) => onSetGroupTypes(group.id, names)}
                  onHide={() => onHideGroup(group.id)}
                  onToggleType={(name, enabled) => onToggleType(group.id, name, enabled)}
                />
              );
            })
            )}
          </div>
        </Section>

        <Section
          title="Hidden"
          collapsed={state.collapsedSections.hidden}
          onToggle={() => onToggleSection("hidden")}
        >
          {hiddenGroups.length === 0 ? (
            <p className="text-gray-400 px-1">No hidden categories</p>
          ) : (
            <ul className="space-y-2">
              {hiddenGroups.map((group) => (
                <li key={group.id} className="flex items-center justify-between px-1">
                  <span>{group.label}</span>
                  <button
                    type="button"
                    className="text-xs text-blue-600 hover:underline"
                    onClick={() => onUnhideGroup(group.id)}
                  >
                    Unhide
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </aside>
  );
}

function Section({
  title,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-gray-100">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-left font-medium text-gray-700 hover:bg-gray-50"
      >
        {title}
        <span className="text-gray-400 text-xs">{collapsed ? "+" : "-"}</span>
      </button>
      {!collapsed && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

function CategoryGroupSection({
  group,
  isOn,
  enabledTypes,
  onSetGroupTypes,
  onHide,
  onToggleType,
}: {
  group: CategoryGroup;
  isOn: boolean;
  enabledTypes: Set<string>;
  onSetGroupTypes: (displayNames: string[]) => void;
  onHide: () => void;
  onToggleType: (name: string, enabled: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const headerRef = useRef<HTMLInputElement>(null);
  const allNames = group.types.map((type) => type.displayName);
  const selectedCount = allNames.filter((name) => enabledTypes.has(name)).length;
  const allSelected = isOn && selectedCount === allNames.length;
  const someSelected = isOn && selectedCount > 0 && selectedCount < allNames.length;

  const toggleSubgroupTypes = (subgroupNames: string[], enabled: boolean) => {
    const next = new Set(enabledTypes);
    for (const name of subgroupNames) {
      if (enabled) next.add(name);
      else next.delete(name);
    }
    onSetGroupTypes(Array.from(next));
  };

  useEffect(() => {
    if (headerRef.current) {
      headerRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  return (
    <div className="group/card rounded border border-gray-100">
      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-50">
        <input
          ref={headerRef}
          type="checkbox"
          checked={allSelected}
          onChange={(e) => onSetGroupTypes(e.target.checked ? allNames : [])}
          aria-label={`${allSelected ? "Deselect" : "Select"} all ${group.label}`}
        />
        <button
          type="button"
          className="flex-1 min-w-0 text-left font-medium truncate"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          {group.label}
        </button>
        <button
          type="button"
          className="text-xs text-gray-500 hover:text-gray-700 shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity"
          onClick={onHide}
        >
          Hide
        </button>
      </div>
      {expanded && (
        <div className="px-2 py-1 space-y-2">
          {(() => {
            const flatGroup = !hasSubgroupStructure(group.subgroups);
            const subgroups = flatGroup
              ? [{ id: "all", label: "All", types: group.types }]
              : mergeSubgroups(group.subgroups, group.types);
            const hasSubgroupStructureVisible = subgroups.some(
              (sg) => sg.id !== "all" && sg.id !== "other",
            );
            return subgroups.map((subgroup) => (
              <SubgroupSection
                key={subgroup.id}
                subgroup={subgroup}
                showLabel={hasSubgroupStructureVisible && subgroup.id !== "all"}
                isOn={isOn}
                enabledTypes={enabledTypes}
                onToggleSubgroupTypes={toggleSubgroupTypes}
                onToggleType={onToggleType}
              />
            ));
          })()}
        </div>
      )}
    </div>
  );
}

function SubgroupSection({
  subgroup,
  showLabel,
  isOn,
  enabledTypes,
  onToggleSubgroupTypes,
  onToggleType,
}: {
  subgroup: { id: string; label: string; types: { displayName: string; count: number }[] };
  showLabel: boolean;
  isOn: boolean;
  enabledTypes: Set<string>;
  onToggleSubgroupTypes: (names: string[], enabled: boolean) => void;
  onToggleType: (name: string, enabled: boolean) => void;
}) {
  const subgroupNames = subgroup.types.map((type) => type.displayName);
  const selectedCount = subgroupNames.filter((name) => enabledTypes.has(name)).length;
  const allSelected = isOn && subgroupNames.length > 0 && selectedCount === subgroupNames.length;

  if (subgroup.types.length === 0) {
    return null;
  }

  return (
    <div>
      {showLabel ? (
        <button
          type="button"
          className="w-full text-left text-xs font-medium text-gray-500 px-1 py-0.5 hover:text-gray-700"
          onClick={() => onToggleSubgroupTypes(subgroupNames, !allSelected)}
          aria-label={`${allSelected ? "Deselect" : "Select"} all ${subgroup.label}`}
        >
          {subgroup.label}
        </button>
      ) : null}
      <ul className="space-y-0.5">
        {subgroup.types.map((type) => (
          <li key={`${subgroup.id}-${type.displayName}`}>
            <label className="flex items-center gap-2 py-0.5 cursor-pointer">
              <input
                type="checkbox"
                checked={enabledTypes.has(type.displayName)}
                onChange={(e) => onToggleType(type.displayName, e.target.checked)}
              />
              <span className="flex-1 truncate">{type.displayName}</span>
              <span className="text-gray-400 text-xs">{type.count}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

const TIME_PRESETS: { id: TimeFilterPreset; label: string; sublabel: string }[] = [
  { id: "all", label: "All times", sublabel: "" },
  { id: "morning", label: "Morning", sublabel: "before 10 am" },
  { id: "midday", label: "Midday", sublabel: "10 am - 3 pm" },
  { id: "evening", label: "Evening", sublabel: "after 3 pm" },
  { id: "custom", label: "Custom", sublabel: "" },
];

function formatHour(h: number): string {
  if (h === 0) return "12 am";
  if (h < 12) return `${h} am`;
  if (h === 12) return "12 pm";
  return `${h - 12} pm`;
}

function HourSelect({
  value,
  onChange,
  min,
  max,
}: {
  value: string;
  onChange: (hhmm: string) => void;
  min?: number;
  max?: number;
}) {
  const currentHour = parseInt(value.split(":")[0], 10);
  const hours = Array.from({ length: 24 }, (_, i) => i).filter(
    (h) => (min === undefined || h >= min) && (max === undefined || h <= max),
  );
  return (
    <select
      className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white"
      value={currentHour}
      onChange={(e) => onChange(`${e.target.value.padStart(2, "0")}:00`)}
    >
      {hours.map((h) => (
        <option key={h} value={h}>
          {formatHour(h)}
        </option>
      ))}
    </select>
  );
}

function TimeFilterSection({
  timeFilter,
  onSetTimeFilter,
}: {
  timeFilter: TimeFilter;
  onSetTimeFilter: (patch: Partial<TimeFilter>) => void;
}) {
  const startHour = parseInt(timeFilter.customStart.split(":")[0], 10);
  const endHour = parseInt(timeFilter.customEnd.split(":")[0], 10);

  return (
    <div className="space-y-1">
      {TIME_PRESETS.map(({ id, label, sublabel }) => (
        <label key={id} className="flex items-center gap-2 px-1 py-0.5 cursor-pointer hover:bg-gray-50 rounded">
          <input
            type="radio"
            name="time-filter"
            checked={timeFilter.preset === id}
            onChange={() => onSetTimeFilter({ preset: id })}
          />
          <span className="flex-1">
            {label}
            {sublabel && <span className="ml-1 text-gray-400 text-xs">{sublabel}</span>}
          </span>
        </label>
      ))}
      {timeFilter.preset === "custom" && (
        <div className="flex items-center gap-2 px-1 py-1 pl-5">
          <HourSelect
            value={timeFilter.customStart}
            onChange={(v) => onSetTimeFilter({ customStart: v, customEnd: timeFilter.customEnd })}
            min={0}
            max={endHour - 1}
          />
          <span className="text-xs text-gray-400">to</span>
          <HourSelect
            value={timeFilter.customEnd}
            onChange={(v) => onSetTimeFilter({ customEnd: v })}
            min={startHour + 1}
            max={23}
          />
        </div>
      )}
    </div>
  );
}
