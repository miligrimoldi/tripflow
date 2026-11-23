/**
 * Calendar dates without time or timezone, encoded as ISO strings
 * ("YYYY-MM-DD").
 *
 * Trip days are calendar concepts: "March 3rd" is the same day for every
 * traveler regardless of their timezone. Representing them as `Date` objects
 * invites off-by-one bugs, so the domain works with plain strings and only
 * the persistence layer converts them.
 */
export type DateOnly = string;

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isDateOnly(value: string): value is DateOnly {
  if (!DATE_ONLY_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** Converts a UTC-midnight `Date` (as returned for `@db.Date` columns). */
export function dateOnlyFromDate(date: Date): DateOnly {
  return date.toISOString().slice(0, 10);
}

/** Converts to the UTC-midnight `Date` expected by `@db.Date` columns. */
export function dateOnlyToDate(value: DateOnly): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function addDays(value: DateOnly, days: number): DateOnly {
  return dateOnlyFromDate(new Date(dateOnlyToDate(value).getTime() + days * MS_PER_DAY));
}

/** Number of days in the inclusive range [start, end]. */
export function daysInRange(start: DateOnly, end: DateOnly): number {
  return Math.round((dateOnlyToDate(end).getTime() - dateOnlyToDate(start).getTime()) / MS_PER_DAY) + 1;
}

export function eachDayInRange(start: DateOnly, end: DateOnly): DateOnly[] {
  const count = daysInRange(start, end);
  return Array.from({ length: Math.max(count, 0) }, (_, i) => addDays(start, i));
}

export function isWithinRange(value: DateOnly, start: DateOnly, end: DateOnly): boolean {
  // ISO dates compare correctly as strings.
  return value >= start && value <= end;
}
