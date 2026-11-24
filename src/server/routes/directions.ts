import type { Coordinates } from "../shared/coordinates";
import { haversineKm } from "../shared/geo";

/** One stretch of a route, from a stop to the next one. */
export interface RouteLeg {
  distanceKm: number;
  /** Estimated travel time, or `null` when it is unknown (straight lines). */
  durationMin: number | null;
}

export interface Directions {
  /** The line to draw on the map, from the first stop to the last. */
  path: Coordinates[];
  /** `legs[i]` goes from stop `i` to stop `i + 1`. */
  legs: RouteLeg[];
  /** How it was measured, to explain it to the user. */
  source: "roads" | "straight-line";
}

/**
 * Port for "how do I get through these stops, in this order?". The map
 * doesn't care whether the answer comes from a routing engine or is a
 * straight-line approximation.
 */
export interface DirectionsProvider {
  directions(stops: Coordinates[]): Promise<Directions>;
}

/**
 * Straight lines between stops: instant, free, offline. Without roads there
 * is no honest way to estimate times, so durations are left unknown.
 */
export class StraightLineDirections implements DirectionsProvider {
  async directions(stops: Coordinates[]): Promise<Directions> {
    return {
      path: stops,
      legs: stops.slice(1).map((to, i) => ({ distanceKm: haversineKm(stops[i], to), durationMin: null })),
      source: "straight-line",
    };
  }
}

/** Uses `primary` (e.g. a routing API) and falls back if it fails. */
export class FallbackDirections implements DirectionsProvider {
  constructor(
    private readonly primary: DirectionsProvider,
    private readonly fallback: DirectionsProvider,
  ) {}

  async directions(stops: Coordinates[]): Promise<Directions> {
    try {
      return await this.primary.directions(stops);
    } catch (error) {
      console.warn("[routes] primary directions provider failed, using fallback", error);
      return this.fallback.directions(stops);
    }
  }
}

/** Total distance and time of a route. Time is `null` if any leg's is unknown. */
export function routeTotals(legs: RouteLeg[]): RouteLeg {
  return {
    distanceKm: legs.reduce((sum, leg) => sum + leg.distanceKm, 0),
    durationMin: legs.every((leg) => leg.durationMin !== null)
      ? legs.reduce((sum, leg) => sum + leg.durationMin!, 0)
      : null,
  };
}
