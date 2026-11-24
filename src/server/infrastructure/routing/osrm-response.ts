import { z } from "zod";

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
