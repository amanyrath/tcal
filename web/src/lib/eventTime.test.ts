import { describe, expect, it } from "vitest";
import {
  eventDurationMinutes,
  eventHeightFromDuration,
} from "./eventTime";

describe("eventDurationMinutes", () => {
  it("returns duration between start and end", () => {
    expect(
      eventDurationMinutes("2026-07-08 18:00:00", "2026-07-08 19:00:00"),
    ).toBe(60);
    expect(
      eventDurationMinutes("2026-07-08 06:15:00", "2026-07-08 07:15:00"),
    ).toBe(60);
  });
});

describe("eventHeightFromDuration", () => {
  it("scales height with class duration", () => {
    const short = eventHeightFromDuration("2026-07-08 12:00:00", "2026-07-08 12:30:00");
    const long = eventHeightFromDuration("2026-07-08 12:00:00", "2026-07-08 14:00:00");
    expect(short).toBeLessThan(long);
    expect(long).toBe(120 * 1.2);
  });

  it("enforces a minimum height for short classes", () => {
    expect(
      eventHeightFromDuration("2026-07-08 12:00:00", "2026-07-08 12:05:00"),
    ).toBe(40);
  });
});
