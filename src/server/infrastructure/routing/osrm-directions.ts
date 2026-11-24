import "server-only";
import { cacheLife } from "next/cache";
import type { Directions, DirectionsProvider } from "@/server/routes/directions";
import type { Coordinates } from "@/server/shared/coordinates";
import { fetchOsrm, osrmUrl } from "./osrm-request";
import { parseOsrmRoute } from "./osrm-response";

/**
 * Driving route through a day's stops from an OSRM server (Route service):
 * the path along the streets plus the distance and time of each leg.
 */
export class OsrmDirections implements DirectionsProvider {
  constructor(private readonly baseUrl: string) {}

  directions(stops: Coordinates[]): Promise<Directions> {
    return fetchRoute(osrmUrl(this.baseUrl, "route", stops, "overview=full&geometries=geojson"), stops.length);
  }
}

/**
 * Cached per URL (that is, per sequence of stops): the map is opened far
 * more often than a day's stops change, and caching keeps us within the
 * fair-use limits of public OSRM servers.
 */
async function fetchRoute(url: string, stopCount: number): Promise<Directions> {
  "use cache";
  cacheLife("days");
  return parseOsrmRoute(await fetchOsrm(url), stopCount);
}
