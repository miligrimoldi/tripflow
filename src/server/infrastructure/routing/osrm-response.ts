import { z } from "zod";
import type { Directions } from "@/server/routes/directions";

/**
 * The part of OSRM's Table service response we use.
 * Docs: https://project-osrm.org/docs/v5.24.0/api/#table-service
 */
const osrmTableSchema = z.object({
  code: z.string(),
  durations: z.array(z.array(z.number().nullable())),
});

/**
 * Travel times in minutes from an OSRM table response. Throws if any pair
 * is unreachable (null), so the caller can fall back to straight-line costs.
 */
export function parseOsrmDurations(json: unknown, size: number): number[][] {
  const parsed = osrmTableSchema.safeParse(json);
  if (!parsed.success || parsed.data.code !== "Ok") throw new Error("Unexpected OSRM response");

  const { durations } = parsed.data;
  if (durations.length !== size || durations.some((row) => row.length !== size)) {
    throw new Error("OSRM matrix has the wrong size");
  }
  return durations.map((row) =>
    row.map((seconds) => {
      if (seconds === null) throw new Error("OSRM could not route between two points");
      return seconds / 60;
    }),
  );
}

/**
 * The part of OSRM's Route service response we use (with
 * `geometries=geojson`). Docs: https://project-osrm.org/docs/v5.24.0/api/#route-service
 */
const osrmRouteSchema = z.object({
  code: z.string(),
  routes: z
    .array(
      z.object({
        geometry: z.object({ coordinates: z.array(z.tuple([z.number(), z.number()])).min(2) }),
        legs: z.array(z.object({ distance: z.number(), duration: z.number() })),
      }),
    )
    .min(1),
});

/** Path and per-leg distance (km) / time (min) of the best route through `stopCount` stops. */
export function parseOsrmRoute(json: unknown, stopCount: number): Directions {
  const parsed = osrmRouteSchema.safeParse(json);
  if (!parsed.success || parsed.data.code !== "Ok") throw new Error("Unexpected OSRM response");

  const [route] = parsed.data.routes;
  if (route.legs.length !== stopCount - 1) throw new Error("OSRM route has the wrong number of legs");
  return {
    path: route.geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude })),
    legs: route.legs.map((leg) => ({ distanceKm: leg.distance / 1000, durationMin: leg.duration / 60 })),
    source: "roads",
  };
}
