import "server-only";
import type { TravelCostMatrix, TravelCostProvider } from "@/server/routes/travel-cost";
import type { Coordinates } from "@/server/shared/coordinates";
import { fetchOsrm, osrmUrl } from "./osrm-request";
import { parseOsrmDurations } from "./osrm-response";

/**
 * Real driving times from an OSRM server (Table service, one request per
 * day). The public demo server is for light use only (max 1 request/s), so
 * this adapter is opt-in through ROUTING_URL; production should point it to
 * a self-hosted OSRM.
 */
export class OsrmTravelCost implements TravelCostProvider {
  constructor(private readonly baseUrl: string) {}

  async matrix(points: Coordinates[]): Promise<TravelCostMatrix> {
    const json = await fetchOsrm(osrmUrl(this.baseUrl, "table", points, "annotations=duration"));
    return { values: parseOsrmDurations(json, points.length), unit: "min", source: "roads" };
  }
}
