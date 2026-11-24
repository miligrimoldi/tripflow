import type { Activity, ActivityCategory } from "@/server/activities/activity";

/**
 * Which kinds of place best represent a day, most representative first: a
 * day with a museum and a dinner is "the museum day". Transport rarely makes
 * a good picture.
 */
const COVER_PRIORITY: ActivityCategory[] = [
  "SIGHTSEEING",
  "EXCURSION",
  "ACCOMMODATION",
  "NIGHTLIFE",
  "FOOD",
  "SHOPPING",
  "OTHER",
  "TRANSPORT",
];

/** The photo for a day's banner: the most representative activity that has one. */
export function pickDayCover(
  activities: Pick<Activity, "id" | "category">[],
  photos: Readonly<Record<string, string>>,
): string | null {
  const withPhoto = activities.filter((activity) => photos[activity.id]);
  withPhoto.sort((a, b) => COVER_PRIORITY.indexOf(a.category) - COVER_PRIORITY.indexOf(b.category));
  return withPhoto[0] ? photos[withPhoto[0].id] : null;
}
