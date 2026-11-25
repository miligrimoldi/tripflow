import { routeTotals } from "@/server/routes/directions";
import type { DayDirections } from "@/server/routes/directions.service";
import type { DayRouteSummary } from "./components/day-banner";

/** Each day's total distance (and time, when measured along the streets), by date. */
export function summarizeDayRoutes(days: DayDirections[]): Record<string, DayRouteSummary> {
  return Object.fromEntries(
    days.map((day) => {
      const totals = routeTotals(day.legs);
      return [
        day.date,
        { distanceKm: totals.distanceKm, durationMin: day.source === "roads" ? totals.durationMin : null },
      ];
    }),
  );
}
