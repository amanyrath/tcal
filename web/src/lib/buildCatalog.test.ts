import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "../types/events";
import { buildCatalogFromEvents } from "./buildCatalog";

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "1",
    title: "Yoga for Climbers",
    rawTitle: "Yoga for Climbers",
    start: "2026-07-08 18:00:00",
    end: "2026-07-08 19:00:00",
    gymKey: "pacific-pipe",
    gymName: "Pacific Pipe",
    categoryGroup: "yoga-classes",
    categorySubgroup: "other",
    displayName: "Yoga for Climbers",
    instructor: null,
    capacity: null,
    description: null,
    infoUrl: null,
    sourceUrl: "https://example.com",
    ...overrides,
  };
}

describe("buildCatalogFromEvents", () => {
  it("returns an empty catalog for no events", () => {
    expect(buildCatalogFromEvents([])).toEqual([]);
  });

  it("builds counts for a single gym", () => {
    const catalog = buildCatalogFromEvents([
      makeEvent(),
      makeEvent({ id: "2", displayName: "Vinyasa", title: "Vinyasa", categorySubgroup: "power-vinyasa" }),
      makeEvent({ id: "3", displayName: "Vinyasa", title: "Vinyasa", categorySubgroup: "power-vinyasa" }),
    ]);

    const yoga = catalog.find((group) => group.id === "yoga-classes");
    expect(yoga?.types).toEqual([
      { displayName: "Vinyasa", count: 2 },
      { displayName: "Yoga for Climbers", count: 1 },
    ]);
    expect(yoga?.subgroups?.find((sg) => sg.id === "power-vinyasa")?.types).toEqual([
      { displayName: "Vinyasa", count: 2 },
    ]);
  });

  it("omits types from unselected gyms when events are pre-filtered", () => {
    const pipeOnly = buildCatalogFromEvents([
      makeEvent({ displayName: "Yoga for Climbers" }),
    ]);
    const bothGyms = buildCatalogFromEvents([
      makeEvent({ displayName: "Yoga for Climbers" }),
      makeEvent({
        id: "2",
        gymKey: "ironworks",
        gymName: "Ironworks",
        categoryGroup: "fitness-classes",
        categorySubgroup: "hiit",
        displayName: "HIIT Mixtapes",
        title: "HIIT Mixtapes",
      }),
    ]);

    expect(pipeOnly.map((group) => group.id)).toEqual(["yoga-classes"]);
    expect(bothGyms.map((group) => group.id)).toEqual(["yoga-classes", "fitness-classes"]);
  });

  it("sums counts across selected gyms for shared types", () => {
    const catalog = buildCatalogFromEvents([
      makeEvent({ id: "1", displayName: "Vinyasa", title: "Vinyasa", categorySubgroup: "power-vinyasa" }),
      makeEvent({
        id: "2",
        gymKey: "ironworks",
        gymName: "Ironworks",
        displayName: "Vinyasa",
        title: "Vinyasa",
        categorySubgroup: "power-vinyasa",
      }),
    ]);

    const yoga = catalog.find((group) => group.id === "yoga-classes");
    expect(yoga?.types).toEqual([{ displayName: "Vinyasa", count: 2 }]);
  });

  it("builds a flat affinity group without subgroup buckets", () => {
    const catalog = buildCatalogFromEvents([
      makeEvent({
        categoryGroup: "affinity-meetup-groups",
        displayName: "Queer Crush",
        title: "Queer Crush",
      }),
      makeEvent({
        id: "2",
        categoryGroup: "affinity-meetup-groups",
        displayName: "Escalemos",
        title: "Escalemos",
      }),
    ]);

    const affinity = catalog.find((group) => group.id === "affinity-meetup-groups");
    expect(affinity?.types).toEqual([
      { displayName: "Escalemos", count: 1 },
      { displayName: "Queer Crush", count: 1 },
    ]);
    expect(affinity?.subgroups).toEqual([
      {
        id: "other",
        label: "All",
        types: [
          { displayName: "Escalemos", count: 1 },
          { displayName: "Queer Crush", count: 1 },
        ],
      },
    ]);
  });
});
