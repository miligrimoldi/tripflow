import type { Coordinates } from "../shared/coordinates";
import { isWithinRange, type DateOnly } from "../shared/date-only";
import { tripDays, type Trip } from "../trips/trip";

export const ACTIVITY_CATEGORIES = [
  "SIGHTSEEING",
  "FOOD",
  "EXCURSION",
  "ACCOMMODATION",
  "TRANSPORT",
  "SHOPPING",
  "NIGHTLIFE",
  "OTHER",
] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export interface Activity {
  id: string;
  tripId: string;
  title: string;
  category: ActivityCategory;
  notes: string | null;
  location: string | null;
  /** Where `location` is on the map, if it was picked from the place search. */
  coordinates: Coordinates | null;
  url: string | null;
  /** `null` means the activity is an idea that is not scheduled yet. */
  date: DateOnly | null;
  startTime: string | null;
  position: number;
  createdBy: { id: string; name: string };
  createdAt: Date;
  updatedAt: Date;
}

export type ActivityDetails = Pick<
  Activity,
  "title" | "category" | "notes" | "location" | "coordinates" | "url" | "date" | "startTime"
>;

export type NewActivity = ActivityDetails & {
  tripId: string;
  position: number;
  createdById: string;
};

export interface ItineraryDay {
  date: DateOnly;
  dayNumber: number;
  activities: Activity[];
}

export interface Itinerary {
  days: ItineraryDay[];
  ideas: Activity[];
}

const byPosition = (a: Activity, b: Activity) => a.position - b.position;

/**
 * Groups a trip's activities into one bucket per day plus the ideas board.
 * Every day of the trip is present, even if it has no activities yet.
 */
export function buildItinerary(trip: Pick<Trip, "startDate" | "endDate">, activities: Activity[]): Itinerary {
  const byDate = new Map<DateOnly, Activity[]>(tripDays(trip).map((date) => [date, []]));
  const ideas: Activity[] = [];

  for (const activity of activities) {
    const bucket = activity.date ? byDate.get(activity.date) : undefined;
    // Activities dated outside the trip should not exist, but if they do we
    // surface them as ideas rather than silently hiding them.
    (bucket ?? ideas).push(activity);
  }

  return {
    days: [...byDate.entries()].map(([date, dayActivities], index) => ({
      date,
      dayNumber: index + 1,
      activities: dayActivities.sort(byPosition),
    })),
    ideas: ideas.sort(byPosition),
  };
}

/** Every known point of the itinerary (activities whose location is on the map). */
export function itineraryPoints(itinerary: Itinerary): Coordinates[] {
  return [...itinerary.days.flatMap((day) => day.activities), ...itinerary.ideas].flatMap((activity) =>
    activity.coordinates ? [activity.coordinates] : [],
  );
}

export function isDateInTrip(date: DateOnly, trip: Pick<Trip, "startDate" | "endDate">): boolean {
  return isWithinRange(date, trip.startDate, trip.endDate);
}

/**
 * The ordered activities of one "slot": a day of the itinerary, or the ideas
 * board when `date` is null. `activityIds[i]` has position `i`.
 */
export interface SlotOrder {
  date: DateOnly | null;
  activityIds: string[];
}

interface MovePlan {
  activityId: string;
  /** Slot the activity currently belongs to. */
  from: SlotOrder;
  /** Destination slot (may be the same as `from`). */
  to: SlotOrder;
  /** Destination index; clamped to the slot bounds, `undefined` appends at the end. */
  index?: number;
}

/**
 * Computes the new order of the affected slots when an activity is moved.
 * Returns one slot when reordering inside the same day and two when the
 * activity changes day (the source without it, the target with it).
 */
export function planMove({ activityId, from, to, index }: MovePlan): SlotOrder[] {
  const withoutActivity = (ids: string[]) => ids.filter((id) => id !== activityId);

  const targetIds = withoutActivity(to.activityIds);
  const at = Math.min(Math.max(index ?? targetIds.length, 0), targetIds.length);
  targetIds.splice(at, 0, activityId);

  const target = { date: to.date, activityIds: targetIds };
  if (from.date === to.date) return [target];
  return [{ date: from.date, activityIds: withoutActivity(from.activityIds) }, target];
}
