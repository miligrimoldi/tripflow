import { describe, expect, it } from "vitest";
import { costSourceLabel, formatCost, formatDistance, formatDuration, formatSavings, savingsRatio } from "./format";

describe("route formatting", () => {
  it("formats costs by unit", () => {
    expect(formatCost(12.44, "km")).toBe("12,4 km");
    expect(formatCost(34.6, "min")).toBe("35 min");
  });

  it("explains how the cost was measured", () => {
    expect(costSourceLabel("straight-line")).toBe("en línea recta");
    expect(costSourceLabel("roads")).toBe("en auto");
  });

  it("computes savings without going negative", () => {
    expect(savingsRatio({ currentCost: 20, suggestedCost: 12 })).toBeCloseTo(0.4);
    expect(formatSavings({ currentCost: 20, suggestedCost: 12 })).toMatch(/^40\s?%$/);
    expect(savingsRatio({ currentCost: 0, suggestedCost: 0 })).toBe(0);
  });
});

describe("leg formatting", () => {
  it("formats distances in meters or kilometers", () => {
    expect(formatDistance(0.004)).toBe("10 m");
    expect(formatDistance(0.846)).toBe("850 m");
    expect(formatDistance(4.23)).toBe("4,2 km");
    expect(formatDistance(38.4)).toBe("38 km");
  });

  it("formats durations in minutes and hours", () => {
    expect(formatDuration(0.2)).toBe("1 min");
    expect(formatDuration(44.6)).toBe("45 min");
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(125)).toBe("2 h 05 min");
  });
});
