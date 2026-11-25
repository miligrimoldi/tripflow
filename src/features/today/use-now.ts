"use client";

import { useSyncExternalStore } from "react";

const TICK_MS = 30_000;

/** "2026-07-11 10:15" in the trip's time zone: a primitive, so React can compare snapshots. */
function nowIn(timeZone: string | null): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone ?? undefined,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, TICK_MS);
  return () => clearInterval(id);
}

/**
 * The current time in the trip's place, updated every 30 s. `null` on the
 * server (it can't know the viewer's "now"), so the first render matches and
 * the live parts appear right after hydration.
 */
export function useNow(timeZone: string | null): { date: string; minutes: number; label: string } | null {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => nowIn(timeZone),
    () => null,
  );
  if (!snapshot) return null;
  const [date, time] = snapshot.split(" ");
  const [hours, minutes] = time.split(":").map(Number);
  return { date, minutes: hours * 60 + minutes, label: time };
}
