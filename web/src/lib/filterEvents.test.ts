import { describe, expect, it } from "vitest";
import { createDefaultState } from "./defaults";
import { filterEvents } from "./filterEvents";
import type { CalendarEvent } from "../types/events";

const sampleEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: "1",
  title: "Yoga for Climbers",
  rawTitle: "Yoga for Climbers w/ Sam",
  start: "2026-07-08 18:00:00",
  end: "2026-07-08 19:00:00",
  gymKey: "pacific-pipe",
  gymName: "Pacific Pipe",
  categoryGroup: "yoga-classes",
  displayName: "Yoga for Climbers",
  instructor: "Sam",
  capacity: "5 spots",
  description: null,
  infoUrl: null,
  sourceUrl: "https://example.com",
  ...overrides,
});

describe("filterEvents", () => {
  it("shows only active gym events", () => {
    const state = createDefaultState();
    state.activeGyms = ["pacific-pipe"];
    const events = [
      sampleEvent(),
      sampleEvent({ id: "2", gymKey: "ironworks", gymName: "Ironworks" }),
    ];
    const filtered = filterEvents(events, state);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].gymKey).toBe("pacific-pipe");
  });

  it("starts with the home gym selected by default", () => {
    const state = createDefaultState();
    expect(state.activeGyms).toEqual(["pacific-pipe"]);
  });

  it("hides events from off groups", () => {
    const state = createDefaultState();
    state.offGroups = ["yoga-classes"];
    const events = [sampleEvent()];
    expect(filterEvents(events, state)).toHaveLength(0);
  });

  it("hides events from hidden groups", () => {
    const state = createDefaultState();
    state.hiddenGroups = ["gym-events", "yoga-classes"];
    const events = [sampleEvent()];
    expect(filterEvents(events, state)).toHaveLength(0);
  });

  it("filters by enabled display names", () => {
    const state = createDefaultState();
    state.activeGyms = ["pacific-pipe"];
    state.enabledTypes["yoga-classes"] = ["Vinyasa"];
    const events = [
      sampleEvent(),
      sampleEvent({
        id: "2",
        title: "Vinyasa",
        displayName: "Vinyasa",
      }),
    ];
    const filtered = filterEvents(events, state);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].displayName).toBe("Vinyasa");
  });

  it("hides all types when group enabled list is empty", () => {
    const state = createDefaultState();
    state.activeGyms = ["pacific-pipe"];
    state.enabledTypes["yoga-classes"] = [];
    state.offGroups = state.offGroups.filter((id) => id !== "yoga-classes");
    const events = [sampleEvent()];
    expect(filterEvents(events, state)).toHaveLength(0);
  });
});
