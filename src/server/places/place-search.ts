import type { Coordinates } from "../shared/coordinates";
import type { Place } from "./place";

export interface PlaceSearchOptions {
  /** Prefer results close to this point (e.g. where the trip is). */
  near?: Coordinates;
  limit: number;
}

/**
 * Port for geocoding providers. The app only depends on this interface, so
 * switching from Photon to another provider (or a self-hosted instance)
 * means writing one new adapter.
 */
export interface PlaceSearch {
  search(query: string, options: PlaceSearchOptions): Promise<Place[]>;
}

/** Thrown by adapters when the provider is down or answers with an error. */
export class PlaceSearchUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Place search provider unavailable", { cause });
    this.name = "PlaceSearchUnavailableError";
  }
}
