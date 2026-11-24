import "server-only";
import { cacheLife } from "next/cache";

const TIMEOUT_MS = 4000;

/**
 * GET a JSON document, cached for an hour per URL: rates move during the
 * day, but nobody needs them to the minute and the public APIs are free.
 */
export async function fetchJsonHourly(url: string): Promise<unknown> {
  "use cache";
  cacheLife("hours");

  const response = await fetch(url, {
    headers: { "User-Agent": "TripFlow (collaborative trip planner)" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).host}`);
  return response.json();
}
