import { describe, expect, it } from "vitest";
import { createDefaultState, syncEnabledTypesWithCatalog } from "./defaults";
import type { EventsResponse } from "../types/events";

const sampleData: EventsResponse = {
  updatedAt: "2026-07-08T12:00:00Z",
  gyms: [],
  categoryGroups: [
    {
      id: "yoga-classes",
      label: "Yoga Classes",
      types: [
        { displayName: "Yoga for Climbers", count: 5 },
        { displayName: "Vinyasa", count: 3 },
      ],
    },
    {
      id: "fitness-classes",
      label: "Fitness Classes",
      types: [{ displayName: "HIIT Mixtapes", count: 2 }],
    },
    {
      id: "gym-events",
      label: "Gym Events",
      types: [{ displayName: "Speed Wall Hours", count: 1 }],
    },
  ],
  events: [],
};

describe("createDefaultState", () => {
  it("selects all class types in visible categories", () => {
    const state = createDefaultState(sampleData);
    expect(state.enabledTypes["yoga-classes"]).toEqual(["Yoga for Climbers", "Vinyasa"]);
    expect(state.enabledTypes["fitness-classes"]).toEqual(["HIIT Mixtapes"]);
    expect(state.enabledTypes["gym-events"]).toEqual(["Speed Wall Hours"]);
    expect(state.offGroups).toEqual([]);
  });

  it("starts with the home gym selected", () => {
    const state = createDefaultState(sampleData);
    expect(state.activeGyms).toEqual(["pacific-pipe"]);
  });
});

describe("syncEnabledTypesWithCatalog", () => {
  const catalog = sampleData.categoryGroups;

  it("auto-enables newly visible types", () => {
    const next = syncEnabledTypesWithCatalog({ "yoga-classes": ["Vinyasa"] }, catalog, [], []);
    expect(next["yoga-classes"]).toEqual(["Vinyasa", "Yoga for Climbers"]);
  });

  it("prunes types that are no longer in the catalog", () => {
    const next = syncEnabledTypesWithCatalog(
      { "yoga-classes": ["Vinyasa", "Yoga for Climbers"], "fitness-classes": ["HIIT Mixtapes"] },
      [{ id: "yoga-classes", label: "Yoga Classes", types: [{ displayName: "Vinyasa", count: 1 }] }],
      [],
      [],
    );
    expect(next["yoga-classes"]).toEqual(["Vinyasa"]);
    expect(next["fitness-classes"]).toBeUndefined();
  });

  it("does not auto-enable types for off groups", () => {
    const next = syncEnabledTypesWithCatalog({ "yoga-classes": ["Vinyasa"] }, catalog, [], ["yoga-classes"]);
    expect(next["yoga-classes"]).toEqual(["Vinyasa"]);
  });

  it("does not auto-enable types for hidden groups", () => {
    const next = syncEnabledTypesWithCatalog({ "yoga-classes": ["Vinyasa"] }, catalog, ["yoga-classes"], []);
    expect(next["yoga-classes"]).toEqual(["Vinyasa"]);
  });
});
