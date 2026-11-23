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
  "title" | "category" | "notes" | "location" | "url" | "date" | "startTime"
>;

export function toDetails(activity: Activity): ActivityDetails {
  const { title, category, notes, location, url, date, startTime } = activity;
  return { title, category, notes, location, url, date, startTime };
}

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

export function isDateInTrip(date: DateOnly, trip: Pick<Trip, "startDate" | "endDate">): boolean {
  return isWithinRange(date, trip.startDate, trip.endDate);
}

export type MoveDirection = "up" | "down";

/**
 * Returns the ids of `items` in their new order after moving `id` one slot
 * in `direction`. Returns `null` when the move is not possible (already at
 * the edge or id not found).
 */
export function reorder(items: Pick<Activity, "id">[], id: string, direction: MoveDirection): string[] | null {
  const ids = items.map((item) => item.id);
  const from = ids.indexOf(id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= ids.length) return null;

  [ids[from], ids[to]] = [ids[to], ids[from]];
  return ids;
}
