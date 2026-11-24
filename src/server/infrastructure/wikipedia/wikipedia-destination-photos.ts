import "server-only";
import { cacheLife } from "next/cache";
import type { DestinationPhoto } from "@/server/covers/cover";
import type { DestinationPhotoSource } from "@/server/covers/ports";
import { parseWikipediaPhoto } from "./wikipedia-response";

const API_URL = "https://es.wikipedia.org/w/api.php";
const TIMEOUT_MS = 4000;

/**
 * The main photo of the destination's Wikipedia article (free licenses, no
 * API key). Searching instead of looking up an exact title turns
 * "Bariloche, Argentina" into the "San Carlos de Bariloche" article.
 */
export class WikipediaDestinationPhotos implements DestinationPhotoSource {
  find(destination: string): Promise<DestinationPhoto | null> {
    const url = new URL(API_URL);
    url.search = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      generator: "search",
      gsrsearch: destination.trim().toLowerCase(),
      gsrlimit: "1",
      prop: "pageimages",
      piprop: "thumbnail|name",
      pithumbsize: "1600",
    }).toString();
    return fetchPhoto(url.toString());
  }
}

/** Cached per destination: a city's photo rarely changes and trips are listed often. */
async function fetchPhoto(url: string): Promise<DestinationPhoto | null> {
  "use cache";
  cacheLife("weeks");

  const response = await fetch(url, {
    headers: { "User-Agent": "TripFlow (collaborative trip planner)" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Wikipedia HTTP ${response.status}`);
  return parseWikipediaPhoto(await response.json());
}
