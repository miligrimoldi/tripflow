import { formatDayShort } from "@/lib/format";
import { tripDays, type Trip } from "@/server/trips/trip";
import type { DayOption } from "./components/activity-form";

/** Options for "which day?" selects: "Día 1 · 3 mar", "Día 2 · 4 mar", … */
export function toDayOptions(trip: Pick<Trip, "startDate" | "endDate">): DayOption[] {
  return tripDays(trip).map((date, index) => ({
    value: date,
    label: `Día ${index + 1} · ${formatDayShort(date)}`,
  }));
}
