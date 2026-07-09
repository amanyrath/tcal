import { afterEach, describe, expect, it, vi } from "vitest";
import { localDateString, shiftWeek, startOfWeek, goToToday, isToday, isPastDay } from "./dates";

describe("startOfWeek", () => {
  it("returns same day for Monday", () => {
    const monday = new Date("2026-07-06T10:00:00");
    expect(startOfWeek(monday)).toBe("2026-07-06");
  });

  it("returns prior Monday for Wednesday", () => {
    const wednesday = new Date("2026-07-08T10:00:00");
    expect(startOfWeek(wednesday)).toBe("2026-07-06");
  });

  it("returns prior Monday for Sunday", () => {
    const sunday = new Date("2026-07-12T10:00:00");
    expect(startOfWeek(sunday)).toBe("2026-07-06");
  });

  it("uses local date near timezone boundaries", () => {
    const sundayLate = new Date("2026-07-12T22:00:00-07:00");
    expect(startOfWeek(sundayLate)).toBe("2026-07-06");
  });
});

describe("shiftWeek", () => {
  it("shifts forward seven days", () => {
    expect(shiftWeek("2026-07-06", 1)).toBe("2026-07-13");
  });

  it("shifts backward across month boundary", () => {
    expect(shiftWeek("2026-07-06", -1)).toBe("2026-06-29");
  });
});

describe("localDateString", () => {
  it("formats using local calendar date", () => {
    const date = new Date("2026-07-08T23:30:00-07:00");
    expect(localDateString(date)).toBe("2026-07-08");
  });
});

describe("goToToday", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns Monday of the current week", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-08T10:00:00"));
    expect(goToToday()).toBe("2026-07-06");
  });
});

describe("isToday", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true for the current calendar day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-08T15:00:00"));
    expect(isToday(new Date("2026-07-08T08:00:00"))).toBe(true);
    expect(isToday(new Date("2026-07-07T23:59:00"))).toBe(false);
  });
});

describe("isPastDay", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true for days before today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-08T12:00:00"));
    expect(isPastDay(new Date("2026-07-07T12:00:00"))).toBe(true);
    expect(isPastDay(new Date("2026-07-08T00:00:00"))).toBe(false);
    expect(isPastDay(new Date("2026-07-09T12:00:00"))).toBe(false);
  });
});
