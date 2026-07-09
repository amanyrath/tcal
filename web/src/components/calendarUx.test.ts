import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "../types/events";
import { eventStyle } from "../lib/eventDisplay";
import { MAX_VISIBLE_EVENTS, sliceEventsForDisplay } from "../lib/dayOverflow";

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "event-1",
    title: "HIIT",
    rawTitle: "HIIT",
    start: "2026-07-08 18:00:00",
    end: "2026-07-08 19:00:00",
    gymKey: "ironworks",
    gymName: "Ironworks",
    categoryGroup: "fitness-classes",
    displayName: "HIIT",
    instructor: "Alex",
    capacity: "2 spaces",
    description: null,
    infoUrl: null,
    sourceUrl: "https://example.com",
    ...overrides,
  };
}

describe("eventStyle", () => {
  it("uses API colors when present", () => {
    const style = eventStyle(
      makeEvent({ backgroundColor: "#2f6b3a", textColor: "#ffffff" }),
    );
    expect(style.bg).toBe("#2f6b3a");
    expect(style.text).toBe("#ffffff");
  });

  it("falls back to category colors when API colors are missing", () => {
    const style = eventStyle(makeEvent({ backgroundColor: null, textColor: null }));
    expect(style.bg).toBe("#2f6b3a");
    expect(style.text).toBe("#ffffff");
  });
});

describe("sliceEventsForDisplay", () => {
  it("shows first eight events when collapsed", () => {
    const events = Array.from({ length: 10 }, (_, index) =>
      makeEvent({ id: `event-${index}` }),
    );
    const result = sliceEventsForDisplay(events, false);
    expect(result.visible).toHaveLength(MAX_VISIBLE_EVENTS);
    expect(result.remaining).toBe(2);
  });

  it("shows all events when expanded", () => {
    const events = Array.from({ length: 10 }, (_, index) =>
      makeEvent({ id: `event-${index}` }),
    );
    const result = sliceEventsForDisplay(events, true);
    expect(result.visible).toHaveLength(10);
    expect(result.remaining).toBe(0);
  });
});
