import { describe, expect, it } from "vitest";
import { normalizeGroupId } from "./groupIds";
import { buildCatalogFromEvents } from "./buildCatalog";
import type { CalendarEvent } from "../types/events";

describe("normalizeGroupId", () => {
  it("maps legacy ids to storefront slugs", () => {
    expect(normalizeGroupId("yoga")).toBe("yoga-classes");
    expect(normalizeGroupId("community")).toBe("affinity-meetup-groups");
    expect(normalizeGroupId("notices")).toBe("gym-events");
  });
});

describe("buildCatalogFromEvents legacy ids", () => {
  it("normalizes stale event and catalog ids", () => {
    const event: CalendarEvent = {
      id: "1",
      title: "Queer Crush",
      rawTitle: "Queer Crush",
      start: "2026-07-08 18:00:00",
      end: "2026-07-08 19:00:00",
      gymKey: "pacific-pipe",
      gymName: "Pacific Pipe",
      categoryGroup: "community",
      displayName: "Queer Crush",
      instructor: null,
      capacity: null,
      description: null,
      infoUrl: null,
      sourceUrl: "https://example.com",
    };

    const catalog = buildCatalogFromEvents([event], [
      { id: "community", label: "Affinity & Community" },
    ]);

    expect(catalog).toHaveLength(1);
    expect(catalog[0]?.id).toBe("affinity-meetup-groups");
    expect(catalog[0]?.label).toBe("Affinity Groups");
  });
});
