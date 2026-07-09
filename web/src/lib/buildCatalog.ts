import type { CalendarEvent, CategoryGroup, CategorySubgroup, CategoryType } from "../types/events";
import { normalizeGroupId, STOREFRONT_GROUP_LABELS } from "./groupIds";

type GroupDef = { id: string; label: string; subgroups?: { id: string; label: string }[] };

const DEFAULT_GROUP_DEFS: GroupDef[] = [
  {
    id: "intro-classes",
    label: "Intro Classes",
  },
  {
    id: "yoga-classes",
    label: "Yoga Classes",
    subgroups: [
      { id: "power-vinyasa", label: "Power / Vinyasa" },
      { id: "restorative", label: "Restorative" },
      { id: "other", label: "Other" },
    ],
  },
  {
    id: "yoga-clinics",
    label: "Yoga Clinics",
    subgroups: [
      { id: "power-vinyasa", label: "Power / Vinyasa" },
      { id: "restorative", label: "Restorative" },
      { id: "other", label: "Other" },
    ],
  },
  {
    id: "fitness-classes",
    label: "Fitness Classes",
    subgroups: [
      { id: "hiit", label: "HIIT / Bootcamp" },
      { id: "strength", label: "Strength" },
      { id: "mobility", label: "Mobility" },
      { id: "other", label: "Other" },
    ],
  },
  {
    id: "fitness-clinics",
    label: "Fitness Clinics",
    subgroups: [
      { id: "hiit", label: "HIIT / Bootcamp" },
      { id: "strength", label: "Strength" },
      { id: "mobility", label: "Mobility" },
      { id: "other", label: "Other" },
    ],
  },
  {
    id: "climbing-clinics",
    label: "Climbing Clinics",
    subgroups: [
      { id: "lead", label: "Lead & Advanced" },
      { id: "setting", label: "Setting & Technique" },
      { id: "other", label: "Other" },
    ],
  },
  {
    id: "affinity-meetup-groups",
    label: "Affinity Groups",
  },
  {
    id: "youth-programs",
    label: "Youth Programs",
    subgroups: [
      { id: "summer-camp", label: "Summer Camp" },
      { id: "other", label: "Other" },
    ],
  },
  {
    id: "gym-events",
    label: "Gym Events",
    subgroups: [
      { id: "notices", label: "Notices" },
      { id: "competitions", label: "Competitions" },
      { id: "social", label: "Social" },
      { id: "other", label: "Other" },
    ],
  },
];

const FALLBACK_GROUP = "uncategorized";

function isFlatGroupDef(groupDef: GroupDef): boolean {
  return !groupDef.subgroups?.some((sg) => sg.id !== "other" && sg.id !== "all");
}

function sortTypes(types: CategoryType[]): CategoryType[] {
  return [...types].sort((a, b) => b.count - a.count || a.displayName.localeCompare(b.displayName));
}

function buildSubgroupCatalog(
  subgroupDefs: { id: string; label: string }[] | undefined,
  subgroupCounts: Map<string, Map<string, number>>,
  flatTypes: CategoryType[],
): CategorySubgroup[] {
  if (!subgroupDefs) {
    return [{ id: "other", label: "All", types: flatTypes }];
  }

  const subgroups = subgroupDefs.map((def) => ({
    id: def.id,
    label: def.label,
    types: sortTypes(
      [...(subgroupCounts.get(def.id) ?? new Map()).entries()].map(([displayName, count]) => ({
        displayName,
        count,
      })),
    ),
  }));

  const totalFromSubgroups = subgroups.reduce((sum, sg) => sum + sg.types.length, 0);
  if (totalFromSubgroups === 0 && flatTypes.length > 0) {
    return [{ id: "all", label: "All", types: flatTypes }];
  }

  return subgroups;
}

export function buildCatalogFromEvents(
  events: CalendarEvent[],
  groupDefs: GroupDef[] = DEFAULT_GROUP_DEFS,
): CategoryGroup[] {
  const groupCounts = new Map<string, Map<string, number>>();
  const subgroupCounts = new Map<string, Map<string, Map<string, number>>>();

  for (const event of events) {
    const groupId = normalizeGroupId(event.categoryGroup);
    const subgroupId = event.categorySubgroup ?? "other";
    const displayName = event.displayName;

    const typeCounts = groupCounts.get(groupId) ?? new Map<string, number>();
    typeCounts.set(displayName, (typeCounts.get(displayName) ?? 0) + 1);
    groupCounts.set(groupId, typeCounts);

    const groupSubgroups = subgroupCounts.get(groupId) ?? new Map<string, Map<string, number>>();
    const sgCounts = groupSubgroups.get(subgroupId) ?? new Map<string, number>();
    sgCounts.set(displayName, (sgCounts.get(displayName) ?? 0) + 1);
    groupSubgroups.set(subgroupId, sgCounts);
    subgroupCounts.set(groupId, groupSubgroups);
  }

  const catalog: CategoryGroup[] = [];

  for (const groupDef of groupDefs) {
    const id = normalizeGroupId(groupDef.id);
    const typeCounts = groupCounts.get(id);
    if (!typeCounts || typeCounts.size === 0) continue;

    const flatTypes = sortTypes(
      [...typeCounts.entries()].map(([displayName, count]) => ({ displayName, count })),
    );

    catalog.push({
      id,
      label: STOREFRONT_GROUP_LABELS[id] ?? groupDef.label,
      types: flatTypes,
      subgroups: buildSubgroupCatalog(
        isFlatGroupDef(groupDef) ? undefined : groupDef.subgroups,
        subgroupCounts.get(id) ?? new Map(),
        flatTypes,
      ),
    });
  }

  const knownIds = new Set(groupDefs.map((groupDef) => normalizeGroupId(groupDef.id)));
  for (const [groupId, typeCounts] of groupCounts) {
    if (groupId === FALLBACK_GROUP || knownIds.has(groupId) || typeCounts.size === 0) {
      continue;
    }

    const flatTypes = sortTypes(
      [...typeCounts.entries()].map(([displayName, count]) => ({ displayName, count })),
    );
    catalog.push({
      id: groupId,
      label: STOREFRONT_GROUP_LABELS[groupId] ?? groupId,
      types: flatTypes,
      subgroups: [{ id: "other", label: "All", types: flatTypes }],
    });
  }

  const uncategorizedCounts = groupCounts.get(FALLBACK_GROUP);
  if (uncategorizedCounts && uncategorizedCounts.size > 0) {
    const flatTypes = sortTypes(
      [...uncategorizedCounts.entries()].map(([displayName, count]) => ({ displayName, count })),
    );
    catalog.push({
      id: FALLBACK_GROUP,
      label: "Uncategorized",
      types: flatTypes,
      subgroups: [{ id: "other", label: "All", types: flatTypes }],
    });
  }

  return catalog;
}
