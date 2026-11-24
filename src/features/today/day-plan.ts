import type { Activity, ActivityCategory } from "@/server/activities/activity";
import type { RouteLeg } from "@/server/routes/directions";
import type { DayDirections } from "@/server/routes/directions.service";
import { isWithinRange, type DateOnly } from "@/server/shared/date-only";
import type { Coordinates } from "@/server/shared/coordinates";
import type { Trip } from "@/server/trips/trip";
import { tripTiming } from "@/server/trips/trip";

/** One activity of the day, as the client needs it. */
export interface PlanEntry {
  id: string;
  title: string;
  category: ActivityCategory;
  startTime: string | null;
  location: string | null;
  coordinates: Coordinates | null;
  photoUrl: string | null;
  /** How to get to the next entry, when it's the next stop on the map. */
  legToNext: RouteLeg | null;
  /** `true` when the leg was measured along the streets (so it has a time). */
  legByRoad: boolean;
}

/**
 * The day to show: the requested one if it belongs to the trip; otherwise
 * today while traveling, or the first day before and after the trip.
 */
export function pickDay(trip: Pick<Trip, "startDate" | "endDate">, requested: unknown, today: DateOnly): DateOnly {
  if (typeof requested === "string" && isWithinRange(requested, trip.startDate, trip.endDate)) return requested;
  return tripTiming(trip, today).kind === "ongoing" ? today : trip.startDate;
}

/** The day's activities in visiting order, each with the way to the next stop. */
export function buildDayPlan(
  activities: Activity[],
  directions: Pick<DayDirections, "stopIds" | "legs" | "source"> | null,
  photos: Readonly<Record<string, string>> = {},
): PlanEntry[] {
  return activities.map((activity, i) => {
    const next = activities[i + 1];
    const stop = directions?.stopIds.indexOf(activity.id) ?? -1;
    // Only when the next activity is also the next stop: with an activity
    // without location in between, the leg would point at the wrong place.
    const leg = stop !== -1 && next && directions?.stopIds[stop + 1] === next.id ? directions.legs[stop] : null;
    return {
      id: activity.id,
      title: activity.title,
      category: activity.category,
      startTime: activity.startTime,
      location: activity.location,
      coordinates: activity.coordinates,
      photoUrl: photos[activity.id] ?? null,
      legToNext: leg ?? null,
      legByRoad: directions?.source === "roads",
    };
  });
}

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export interface TimelineState {
  /** Activities before "now": they already started (activities have no end time). */
  done: Set<string>;
  /** The "now" line goes before this entry (`entries.length`: at the end). `null`: not today. */
  nowBefore: number | null;
  /** The next activity: the first not started yet (or the first of the day, if it's not today). */
  next: { index: number; minutesUntil: number | null } | null;
}

/**
 * Where the day stands at `now` (minutes since midnight in the trip's time
 * zone), or for another day when `now` is `null`. "Now" goes right before
 * the first activity whose time hasn't come yet, and everything above it
 * counts as done. Activities without a time follow their place in the
 * itinerary.
 */
export function timelineState(entries: Pick<PlanEntry, "id" | "startTime">[], now: number | null): TimelineState {
  if (now === null) {
    return { done: new Set(), nowBefore: null, next: entries.length > 0 ? { index: 0, minutesUntil: null } : null };
  }

  let lastStarted = -1;
  entries.forEach((entry, i) => {
    if (entry.startTime && toMinutes(entry.startTime) <= now) lastStarted = i;
  });
  const nextIndex = entries.findIndex(
    (entry, i) => i > lastStarted && entry.startTime && toMinutes(entry.startTime) > now,
  );
  // Before the first timed activity of the day, untimed ones at the top are still ahead.
  const nowBefore = nextIndex === -1 ? entries.length : lastStarted === -1 ? 0 : nextIndex;

  return {
    done: new Set(entries.slice(0, nowBefore).map((entry) => entry.id)),
    nowBefore,
    next: nextIndex === -1 ? null : { index: nextIndex, minutesUntil: toMinutes(entries[nextIndex].startTime!) - now },
  };
}
