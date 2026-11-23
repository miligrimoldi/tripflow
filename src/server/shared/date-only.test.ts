import { describe, expect, it } from "vitest";
import {
  addDays,
  dateOnlyFromDate,
  dateOnlyToDate,
  daysInRange,
  eachDayInRange,
  isDateOnly,
  isWithinRange,
} from "./date-only";

describe("date-only", () => {
  it.each(["2026-02-28", "2024-02-29", "2026-12-31"])("accepts valid date %s", (value) => {
    expect(isDateOnly(value)).toBe(true);
  });

  it.each(["2026-02-30", "2025-02-29", "2026-13-01", "26-01-01", "2026-1-1", ""])(
    "rejects invalid date %s",
    (value) => {
      expect(isDateOnly(value)).toBe(false);
    },
  );

  it("round-trips through Date without timezone drift", () => {
    expect(dateOnlyFromDate(dateOnlyToDate("2026-03-01"))).toBe("2026-03-01");
  });

  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("counts days inclusively", () => {
    expect(daysInRange("2026-01-01", "2026-01-01")).toBe(1);
    expect(daysInRange("2026-01-30", "2026-02-02")).toBe(4);
  });

  it("lists every day in a range", () => {
    expect(eachDayInRange("2026-01-30", "2026-02-02")).toEqual([
      "2026-01-30",
      "2026-01-31",
      "2026-02-01",
      "2026-02-02",
    ]);
  });

  it("checks range membership inclusively", () => {
    expect(isWithinRange("2026-01-01", "2026-01-01", "2026-01-05")).toBe(true);
    expect(isWithinRange("2026-01-05", "2026-01-01", "2026-01-05")).toBe(true);
    expect(isWithinRange("2026-01-06", "2026-01-01", "2026-01-05")).toBe(false);
  });
});
