import { formatDayShort } from "@/lib/format";
import type { Itinerary } from "@/server/activities/activity";
import type { ActivityOption } from "./components/expense-form";

/** "Día 2 (12 jul) · Esquí en el Catedral", then ideas: "Idea · Kayak". */
export function toActivityOptions(itinerary: Itinerary): ActivityOption[] {
  return [
    ...itinerary.days.flatMap((day) =>
      day.activities.map((activity) => ({
        value: activity.id,
        label: `Día ${day.dayNumber} (${formatDayShort(day.date)}) · ${activity.title}`,
      })),
    ),
    ...itinerary.ideas.map((activity) => ({ value: activity.id, label: `Idea · ${activity.title}` })),
  ];
}
