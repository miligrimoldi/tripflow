import { dateOnlyToDate, type DateOnly } from "@/server/shared/date-only";

// DateOnly values are stored as UTC midnight, so formatting must use UTC to
// show the same calendar day to every user.
const longDay = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

const shortDate = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const shortDateWithYear = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDayLong(date: DateOnly): string {
  const text = longDay.format(dateOnlyToDate(date));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatDayShort(date: DateOnly): string {
  return shortDate.format(dateOnlyToDate(date));
}

export function formatDateRange(start: DateOnly, end: DateOnly): string {
  if (start === end) return shortDateWithYear.format(dateOnlyToDate(start));
  return `${shortDate.format(dateOnlyToDate(start))} – ${shortDateWithYear.format(dateOnlyToDate(end))}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}
