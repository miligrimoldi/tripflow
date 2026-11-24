import "server-only";
import type { Coordinates } from "@/server/shared/coordinates";

const TIMEOUT_MS = 6000;

/** URL of an OSRM service (`table`, `route`…) for the driving profile. */
export function osrmUrl(baseUrl: string, service: "table" | "route", points: Coordinates[], query: string): string {
  // OSRM wants "lon,lat;lon,lat;…".
  const coordinates = points.map((p) => `${p.longitude.toFixed(6)},${p.latitude.toFixed(6)}`).join(";");
  return `${baseUrl.replace(/\/$/, "")}/${service}/v1/driving/${coordinates}?${query}`;
}

export async function fetchOsrm(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { "User-Agent": "TripFlow (collaborative trip planner)" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`OSRM HTTP ${response.status}`);
  return response.json();
}
