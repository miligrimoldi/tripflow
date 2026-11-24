import type { Activity, Itinerary } from "@/server/activities/activity";

/**
 * Client-side shape of the itinerary for drag & drop: one list per "slot",
 * keyed by the day ("YYYY-MM-DD") or {@link IDEAS_SLOT} for the ideas board.
 */
export type BoardSlots = Record<string, Activity[]>;

export const IDEAS_SLOT = "ideas";

export function toBoardSlots(itinerary: Itinerary): BoardSlots {
  return {
    ...Object.fromEntries(itinerary.days.map((day) => [day.date, day.activities])),
    [IDEAS_SLOT]: itinerary.ideas,
  };
}

/** The date a slot represents (`null` for ideas). */
export function slotDate(slotId: string): string | null {
  return slotId === IDEAS_SLOT ? null : slotId;
}

/** Where an activity currently is on the board, or `null` if it is not there. */
export function locate(slots: BoardSlots, activityId: string): { slotId: string; index: number } | null {
  for (const [slotId, activities] of Object.entries(slots)) {
    const index = activities.findIndex((activity) => activity.id === activityId);
    if (index !== -1) return { slotId, index };
  }
  return null;
}
