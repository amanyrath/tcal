import { describe, expect, it } from "vitest";
import { createDefaultState } from "./defaults";
import { buildExportUrl } from "./export";
import type { EventsResponse } from "../types/events";

const sampleData: EventsResponse = {
  updatedAt: "2026-07-08T12:00:00Z",
  gyms: [],
  categoryGroups: [
    {
      id: "intro-classes",
      label: "Intro Classes",
      types: [{ displayName: "Intro to Climbing Class", count: 4 }],
    },
  ],
  events: [],
};

describe("buildExportUrl", () => {
  it("includes active gyms and enabled types", () => {
    const state = createDefaultState(sampleData);
    state.activeGyms = ["pacific-pipe", "ironworks"];
    const url = buildExportUrl(state, "https://example.com");
    expect(url).toContain("gym=pacific-pipe");
    expect(url).toContain("ironworks");
    expect(url).toContain("type=");
    expect(url).toContain("intro");
  });

  it("omits off and hidden groups from type filter", () => {
    const state = createDefaultState(sampleData);
    state.offGroups = ["yoga-classes"];
    const url = buildExportUrl(state, "https://example.com");
    expect(url).not.toContain("yoga-classes");
  });
});
