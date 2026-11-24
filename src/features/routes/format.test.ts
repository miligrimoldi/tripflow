import { describe, expect, it } from "vitest";
import { costSourceLabel, formatCost, formatSavings, savingsRatio } from "./format";

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
