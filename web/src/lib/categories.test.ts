import { describe, expect, it } from "vitest";
import { hasSubgroupStructure, mergeSubgroups } from "./categories";
import type { CategoryType } from "../types/events";

const types: CategoryType[] = [
  { displayName: "FilipinUp", count: 2 },
  { displayName: "Queer Crush", count: 1 },
];

describe("hasSubgroupStructure", () => {
  it("treats only other/all buckets as flat", () => {
    expect(hasSubgroupStructure([{ id: "other", label: "All", types: [] }])).toBe(false);
    expect(hasSubgroupStructure([{ id: "power-vinyasa", label: "Power / Vinyasa", types: [] }])).toBe(
      true,
    );
  });
});

describe("mergeSubgroups", () => {
  it("falls back to flat types when subgroup buckets are empty", () => {
    const merged = mergeSubgroups(undefined, types);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe("all");
    expect(merged[0].types).toEqual(types);
  });

  it("collapses flat other-only API buckets to group types", () => {
    const merged = mergeSubgroups(
      [{ id: "other", label: "All", types: [] }],
      types,
    );
    expect(merged).toEqual([{ id: "all", label: "All", types }]);
  });

  it("uses API subgroup buckets when multiple subgroups have content", () => {
    const merged = mergeSubgroups(
      [
        {
          id: "power-vinyasa",
          label: "Power / Vinyasa",
          types: [{ displayName: "Vinyasa", count: 3 }],
        },
        {
          id: "restorative",
          label: "Restorative",
          types: [{ displayName: "Yin", count: 2 }],
        },
        { id: "other", label: "Other", types: [] },
      ],
      types,
    );
    expect(merged.find((subgroup) => subgroup.id === "power-vinyasa")?.types).toHaveLength(1);
    expect(merged.find((subgroup) => subgroup.id === "restorative")?.types).toHaveLength(1);
    expect(merged.find((subgroup) => subgroup.id === "other")?.types).toHaveLength(0);
  });

  it("collapses to flat when only one subgroup has content", () => {
    const merged = mergeSubgroups(
      [
        {
          id: "power-vinyasa",
          label: "Power / Vinyasa",
          types: [{ displayName: "Vinyasa", count: 3 }],
        },
        { id: "restorative", label: "Restorative", types: [] },
        { id: "other", label: "Other", types: [] },
      ],
      types,
    );
    expect(merged).toEqual([{ id: "all", label: "All", types }]);
  });

  it("falls back when API subgroups exist but are all empty", () => {
    const merged = mergeSubgroups(
      [
        { id: "restorative", label: "Restorative", types: [] },
        { id: "hot", label: "Hot", types: [] },
      ],
      [{ displayName: "Vinyasa", count: 3 }],
    );
    expect(merged).toEqual([
      { id: "all", label: "All", types: [{ displayName: "Vinyasa", count: 3 }] },
    ]);
  });
});
