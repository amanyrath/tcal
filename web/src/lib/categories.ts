import type { CategorySubgroup } from "../types/events";

export function hasSubgroupStructure(subgroups?: CategorySubgroup[]): boolean {
  return Boolean(subgroups?.some((sg) => sg.id !== "all" && sg.id !== "other"));
}

export function mergeSubgroups(
  apiSubgroups: CategorySubgroup[] | undefined,
  fallbackTypes: CategorySubgroup["types"],
): CategorySubgroup[] {
  if (!apiSubgroups?.length || !hasSubgroupStructure(apiSubgroups)) {
    return [{ id: "all", label: "All", types: fallbackTypes }];
  }

  const populated = apiSubgroups.filter(
    (sg) => sg.id !== "all" && sg.id !== "other" && sg.types.length > 0,
  );

  if (populated.length === 0) {
    return [{ id: "all", label: "All", types: fallbackTypes }];
  }

  if (populated.length === 1) {
    return [{ id: "all", label: "All", types: fallbackTypes }];
  }

  return apiSubgroups;
}
