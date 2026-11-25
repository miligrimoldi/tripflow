import { describe, expect, it } from "vitest";
import { summarizeDayRoutes } from "./day-routes";

const day = (date: string, source: "roads" | "straight-line") => ({
  date,
  stopIds: ["a", "b", "c"],
  path: [],
  legs: [
    { distanceKm: 4, durationMin: source === "roads" ? 10 : null },
    { distanceKm: 6.5, durationMin: source === "roads" ? 15 : null },
  ],
  source,
});

describe("summarizeDayRoutes", () => {
  it("adds up each day's legs, with time only along the streets", () => {
    expect(summarizeDayRoutes([day("2026-07-10", "roads"), day("2026-07-11", "straight-line")])).toEqual({
      "2026-07-10": { distanceKm: 10.5, durationMin: 25 },
      "2026-07-11": { distanceKm: 10.5, durationMin: null },
    });
  });
});
