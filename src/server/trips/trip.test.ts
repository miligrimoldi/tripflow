import { describe, expect, it } from "vitest";
import { tripTiming } from "./trip";

describe("tripTiming", () => {
  const trip = { startDate: "2026-07-10", endDate: "2026-07-13" };

  it("counts the days left before the trip", () => {
    expect(tripTiming(trip, "2026-07-01")).toEqual({ kind: "upcoming", daysUntil: 9 });
    expect(tripTiming(trip, "2026-07-09")).toEqual({ kind: "upcoming", daysUntil: 1 });
  });

  it("tells which day of the trip it is", () => {
    expect(tripTiming(trip, "2026-07-10")).toEqual({ kind: "ongoing", dayNumber: 1, totalDays: 4 });
    expect(tripTiming(trip, "2026-07-13")).toEqual({ kind: "ongoing", dayNumber: 4, totalDays: 4 });
  });

  it("knows when the trip is over", () => {
    expect(tripTiming(trip, "2026-07-14")).toEqual({ kind: "past" });
  });
});
