import { z } from "zod";
import { centroid, type Coordinates } from "../shared/coordinates";
import { ValidationError } from "../shared/errors";
import { optionalCoordinateSchema } from "../shared/schemas";
import { parseInput, type RawInput } from "../shared/validation";
import type { Place } from "./place";
import { PlaceSearchUnavailableError, type PlaceSearch } from "./place-search";

const searchSchema = z.object({
  query: z.string().trim().min(2, "Escribí al menos 2 letras").max(100, "La búsqueda es demasiado larga"),
  nearLatitude: optionalCoordinateSchema(90),
  nearLongitude: optionalCoordinateSchema(180),
});

export type PlaceSearchInput = RawInput<typeof searchSchema>;

export const PLACE_SEARCH_LIMIT = 6;

export class PlaceService {
  constructor(private readonly places: PlaceSearch) {}

  async search(input: PlaceSearchInput): Promise<Place[]> {
    const { query, nearLatitude, nearLongitude } = parseInput(searchSchema, input);
    const near =
      nearLatitude !== null && nearLongitude !== null
        ? { latitude: nearLatitude, longitude: nearLongitude }
        : undefined;
    return this.places.search(query, { near, limit: PLACE_SEARCH_LIMIT });
  }

  /**
   * Approximate center of a trip, used to bias place suggestions: the
   * centroid of the places already on the map or, if there are none yet,
   * the location of the trip's destination. `null` if it can't be found;
   * suggestions then simply aren't biased.
   */
  async tripArea(destination: string, knownPoints: Coordinates[]): Promise<Coordinates | null> {
    const center = centroid(knownPoints);
    if (center) return center;
    try {
      const [place] = await this.search({ query: destination });
      return place?.coordinates ?? null;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof PlaceSearchUnavailableError) return null;
      throw error;
    }
  }
}
