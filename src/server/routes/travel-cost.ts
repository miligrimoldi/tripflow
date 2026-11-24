import type { Coordinates } from "../shared/coordinates";
import { haversineKm } from "../shared/geo";

export interface TravelCostMatrix {
  /** `values[i][j]`: cost of going from point i to point j. */
  values: number[][];
  unit: "km" | "min";
  /** How it was measured, to explain it to the user. */
  source: "straight-line" | "roads";
}

/**
 * Port for "how far apart are these places?". The optimizer doesn't care
 * whether costs are kilometers in a straight line or minutes by road.
 */
export interface TravelCostProvider {
  matrix(points: Coordinates[]): Promise<TravelCostMatrix>;
}

/** Straight-line distances: instant, free, offline. Good enough to sort a city day. */
export class StraightLineTravelCost implements TravelCostProvider {
  async matrix(points: Coordinates[]): Promise<TravelCostMatrix> {
    return {
      values: points.map((from) => points.map((to) => haversineKm(from, to))),
      unit: "km",
      source: "straight-line",
    };
  }
}

/** Uses `primary` (e.g. a routing API) and falls back if it fails. */
export class FallbackTravelCost implements TravelCostProvider {
  constructor(
    private readonly primary: TravelCostProvider,
    private readonly fallback: TravelCostProvider,
  ) {}

  async matrix(points: Coordinates[]): Promise<TravelCostMatrix> {
    try {
      return await this.primary.matrix(points);
    } catch (error) {
      console.warn("[routes] primary travel cost provider failed, using fallback", error);
      return this.fallback.matrix(points);
    }
  }
}
