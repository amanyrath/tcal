import { afterEach, describe, expect, it, vi } from "vitest";
import { getDayColumnStyle } from "./calendarDay";

describe("getDayColumnStyle", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("highlights today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-08T12:00:00"));

    expect(getDayColumnStyle(new Date("2026-07-08T08:00:00")).backgroundColor).toBe(
      "var(--cal-today-bg)",
    );
    expect(getDayColumnStyle(new Date("2026-07-07T08:00:00")).backgroundColor).toBe(
      "var(--cal-past-bg)",
    );
    expect(getDayColumnStyle(new Date("2026-07-09T08:00:00")).backgroundColor).toBe("#ffffff");
  });
});
