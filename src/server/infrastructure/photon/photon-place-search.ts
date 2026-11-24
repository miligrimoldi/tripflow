import "server-only";
import { cacheLife } from "next/cache";
import type { Place } from "@/server/places/place";
import { PlaceSearchUnavailableError, type PlaceSearch, type PlaceSearchOptions } from "@/server/places/place-search";
import { parsePhotonResponse } from "./photon-response";

const TIMEOUT_MS = 5000;

/**
 * Place search backed by Photon (OpenStreetMap data, free, no API key).
 * The public instance is fair-use only; for heavy traffic, set PHOTON_URL
 * to a self-hosted instance or swap this adapter.
 */
export class PhotonPlaceSearch implements PlaceSearch {
  constructor(private readonly baseUrl: string) {}

  search(query: string, { near, limit }: PlaceSearchOptions): Promise<Place[]> {
    const url = new URL(this.baseUrl);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", String(limit));
    if (near) {
      // Rounded so nearby searches share cache entries.
      url.searchParams.set("lat", near.latitude.toFixed(2));
      url.searchParams.set("lon", near.longitude.toFixed(2));
    }
    return fetchPlaces(url.toString());
  }
}

/**
 * Cached per URL: the same query returns the same places, and caching keeps
 * us well within Photon's fair-use policy while users type.
 */
async function fetchPlaces(url: string): Promise<Place[]> {
  "use cache";
  cacheLife("days");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": "TripFlow (collaborative trip planner)" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new PlaceSearchUnavailableError(error);
  }
  if (!response.ok) throw new PlaceSearchUnavailableError(`HTTP ${response.status}`);
  return parsePhotonResponse(await response.json());
}
