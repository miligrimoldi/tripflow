import "server-only";
import type { TravelCostMatrix, TravelCostProvider } from "@/server/routes/travel-cost";
import type { Coordinates } from "@/server/shared/coordinates";
import { parseOsrmDurations } from "./osrm-response";

const TIMEOUT_MS = 6000;

/**
 * Real driving times from an OSRM server (Table service, one request per
 * day). The public demo server is for light use only (max 1 request/s), so
 * this adapter is opt-in through ROUTING_URL; production should point it to
 * a self-hosted OSRM.
 */
export class OsrmTravelCost implements TravelCostProvider {
  constructor(private readonly baseUrl: string) {}

  async matrix(points: Coordinates[]): Promise<TravelCostMatrix> {
    // OSRM wants "lon,lat;lon,lat;…".
    const coordinates = points.map((p) => `${p.longitude.toFixed(6)},${p.latitude.toFixed(6)}`).join(";");
    const url = `${this.baseUrl.replace(/\/$/, "")}/table/v1/driving/${coordinates}?annotations=duration`;

    const response = await fetch(url, {
      headers: { "User-Agent": "TripFlow (collaborative trip planner)" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`OSRM HTTP ${response.status}`);

    return { values: parseOsrmDurations(await response.json(), points.length), unit: "min", source: "roads" };
  }
}
