import type { ActivityCategory } from "@/server/activities/activity";
import { toMinutes } from "@/features/today/day-plan";

/**
 * Activities only have a start time, so the calendar estimates how long each
 * kind usually takes: enough to draw a block of sensible size.
 */
export const ESTIMATED_MINUTES: Record<ActivityCategory, number> = {
  SIGHTSEEING: 120,
  FOOD: 90,
  EXCURSION: 240,
  ACCOMMODATION: 60,
  TRANSPORT: 90,
  SHOPPING: 60,
  NIGHTLIFE: 120,
  OTHER: 60,
};

/** Blocks are never shorter than this, so a title always fits. */
export const MIN_BLOCK_MINUTES = 30;
const DAY_END = 24 * 60;

export interface CalendarBlock {
  id: string;
  /** Minutes since midnight. */
  start: number;
  end: number;
  /** Side-by-side position among overlapping blocks: `column` of `columns`. */
  column: number;
  columns: number;
}

interface TimedActivity {
  id: string;
  category: ActivityCategory;
  startTime: string;
}

/**
 * Places a day's timed activities on the calendar, like a calendar app:
 * each block lasts its estimated duration, cut short when the next activity
 * starts earlier; activities that still overlap (same start time, for
 * example) share the width side by side.
 */
export function layoutDay(activities: TimedActivity[]): CalendarBlock[] {
  const sorted = activities
    .map((activity, order) => ({ ...activity, start: toMinutes(activity.startTime), order }))
    .sort((a, b) => a.start - b.start || a.order - b.order);

  const timed = sorted.map((activity) => {
    const nextStart = sorted.find((other) => other.start > activity.start)?.start ?? DAY_END;
    const length = Math.max(
      MIN_BLOCK_MINUTES,
      Math.min(ESTIMATED_MINUTES[activity.category], nextStart - activity.start),
    );
    return { id: activity.id, start: activity.start, end: Math.min(DAY_END, activity.start + length) };
  });

  // Greedy interval partitioning, one cluster of overlapping blocks at a
  // time: each block takes the first column free at its start.
  const blocks: CalendarBlock[] = [];
  let cluster: CalendarBlock[] = [];
  let clusterEnd = -1;
  const closeCluster = () => {
    const columns = Math.max(1, ...cluster.map((block) => block.column + 1));
    blocks.push(...cluster.map((block) => ({ ...block, columns })));
    cluster = [];
  };

  for (const block of timed) {
    if (block.start >= clusterEnd && cluster.length > 0) closeCluster();
    const columnEnds: number[] = [];
    for (const placed of cluster) columnEnds[placed.column] = Math.max(columnEnds[placed.column] ?? 0, placed.end);
    let column = columnEnds.findIndex((end) => end <= block.start);
    if (column === -1) column = columnEnds.length;
    cluster.push({ ...block, column, columns: 1 });
    clusterEnd = Math.max(clusterEnd, block.end);
  }
  if (cluster.length > 0) closeCluster();
  return blocks;
}

/**
 * The hours the calendar shows: a usual day (8 to 22), stretched to fit
 * every block of the trip.
 */
export function calendarHours(blocks: Pick<CalendarBlock, "start" | "end">[]): { from: number; to: number } {
  const from = Math.min(8, ...blocks.map((block) => Math.floor(block.start / 60)));
  const to = Math.max(22, ...blocks.map((block) => Math.ceil(block.end / 60)));
  return { from, to: Math.min(24, to) };
}
