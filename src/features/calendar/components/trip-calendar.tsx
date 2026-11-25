"use client";

import { Lightbulb } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, type CSSProperties } from "react";
import { TONES } from "@/components/ui/icon-tile";
import { CATEGORY_META } from "@/features/activities/categories";
import { useNow } from "@/features/today/use-now";
import { cn } from "@/lib/cn";
import type { ActivityCategory } from "@/server/activities/activity";
import { calendarHours, layoutDay, type CalendarBlock } from "../calendar-layout";

export interface CalendarActivity {
  id: string;
  title: string;
  category: ActivityCategory;
  startTime: string | null;
  location: string | null;
}

export interface CalendarDay {
  date: string;
  dayNumber: number;
  /** "Sáb". */
  weekday: string;
  /** "11 jul". */
  dayLabel: string;
  activities: CalendarActivity[];
}

interface TripCalendarProps {
  tripId: string;
  days: CalendarDay[];
  /** Members who can edit get a link to each activity. */
  canManage: boolean;
  /** The destination's time zone, for the "now" line; without it, the device's. */
  timeZone: string | null;
}

/** Height of one hour, in px. Blocks and hour lines are positioned with it. */
const HOUR_PX = 56;

const hourLines: CSSProperties = {
  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${HOUR_PX - 1}px, var(--color-slate-100) ${HOUR_PX - 1}px ${HOUR_PX}px)`,
};

const pad = (n: number) => String(n).padStart(2, "0");
const timeLabel = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/**
 * The whole trip at a glance: one column per day, activities as blocks at
 * their time, colored by category. Days scroll sideways on small screens
 * while the hours stay in place.
 */
export function TripCalendar({ tripId, days, canManage, timeZone }: TripCalendarProps) {
  const now = useNow(timeZone);
  const scroller = useRef<HTMLDivElement>(null);
  const today = days.some((day) => day.date === now?.date) ? now!.date : null;

  // On a phone only a couple of days fit: while traveling, start at today.
  useEffect(() => {
    const container = scroller.current;
    const column = container?.querySelector<HTMLElement>(`[data-day="${today}"]`);
    const hours = container?.querySelector<HTMLElement>("[data-hours]");
    if (!today || !container || !column) return;
    container.scrollLeft = column.offsetLeft - (hours?.offsetWidth ?? 0);
  }, [today]);
  const layouts = days.map((day) => ({
    day,
    blocks: layoutDay(day.activities.flatMap((a) => (a.startTime ? [{ ...a, startTime: a.startTime }] : []))),
    untimed: day.activities.filter((activity) => !activity.startTime),
  }));
  const { from, to } = calendarHours(layouts.flatMap((layout) => layout.blocks));
  const hours = Array.from({ length: to - from }, (_, i) => from + i);
  const hasUntimed = layouts.some((layout) => layout.untimed.length > 0);
  const columns = { gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(9.5rem, 1fr))` };

  return (
    <div ref={scroller} className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-soft">
      <div className="grid min-w-fit" style={columns}>
        {/* Day headers */}
        <div data-hours className="sticky left-0 z-20 border-b border-slate-100 bg-white" />
        {days.map((day) => {
          const isToday = now?.date === day.date;
          return (
            <div
              key={day.date}
              data-day={day.date}
              className={cn("border-b border-l border-slate-100 px-3 py-2.5 text-center", isToday && "bg-brand-50/70")}
            >
              <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                Día {day.dayNumber}
                {isToday && <span className="ml-1 text-brand-700">· Hoy</span>}
              </p>
              <p className="font-display text-base font-semibold text-slate-900">
                {day.weekday} {day.dayLabel}
              </p>
            </div>
          );
        })}

        {/* Activities without a time, above the grid */}
        {hasUntimed && (
          <>
            <div className="sticky left-0 z-20 flex items-start justify-end border-b border-slate-100 bg-white px-2 py-2 text-[10px] font-semibold text-slate-400 uppercase">
              Sin hora
            </div>
            {layouts.map(({ day, untimed }) => (
              <ul
                key={day.date}
                className={cn(
                  "space-y-1 border-b border-l border-slate-100 p-1.5",
                  now?.date === day.date && "bg-brand-50/40",
                )}
              >
                {untimed.map((activity) => (
                  <li key={activity.id}>
                    <BlockLink tripId={tripId} activity={activity} canManage={canManage} className="px-2 py-1">
                      <span className="truncate text-xs font-semibold">{activity.title}</span>
                    </BlockLink>
                  </li>
                ))}
              </ul>
            ))}
          </>
        )}

        {/* Hours */}
        <div className="sticky left-0 z-20 bg-white" style={{ height: hours.length * HOUR_PX }}>
          {hours.map((hour) => (
            <p
              key={hour}
              className="absolute right-2 -translate-y-1/2 font-mono text-[11px] text-slate-400 tabular-nums"
              style={{ top: (hour - from) * HOUR_PX }}
            >
              {hour > from && `${pad(hour)}:00`}
            </p>
          ))}
        </div>

        {layouts.map(({ day, blocks }) => {
          const isToday = now?.date === day.date;
          const byId = new Map(day.activities.map((activity) => [activity.id, activity]));
          return (
            <div
              key={day.date}
              className={cn("relative border-l border-slate-100", isToday && "bg-brand-50/40")}
              style={{ ...hourLines, height: hours.length * HOUR_PX }}
            >
              {blocks.map((block) => (
                <Block
                  key={block.id}
                  block={block}
                  activity={byId.get(block.id)!}
                  from={from}
                  tripId={tripId}
                  canManage={canManage}
                />
              ))}
              {isToday && now && now.minutes >= from * 60 && now.minutes <= to * 60 && (
                <div
                  aria-label={`Ahora, ${now.label}`}
                  role="img"
                  className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                  style={{ top: ((now.minutes - from * 60) / 60) * HOUR_PX }}
                >
                  <span className="-ml-1 size-2.5 rounded-full bg-coral-500" />
                  <span className="h-0.5 flex-1 bg-coral-500" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Block({
  block,
  activity,
  from,
  tripId,
  canManage,
}: {
  block: CalendarBlock;
  activity: CalendarActivity;
  from: number;
  tripId: string;
  canManage: boolean;
}) {
  const height = ((block.end - block.start) / 60) * HOUR_PX;
  const style: CSSProperties = {
    top: ((block.start - from * 60) / 60) * HOUR_PX + 1,
    height: height - 3,
    left: `calc(${(block.column / block.columns) * 100}% + 3px)`,
    width: `calc(${100 / block.columns}% - 6px)`,
  };
  const compact = height < 44;

  return (
    <div className="absolute" style={style}>
      <BlockLink
        tripId={tripId}
        activity={activity}
        canManage={canManage}
        className={cn("h-full", compact ? "flex-row items-center gap-1.5 px-2" : "flex-col px-2 py-1.5")}
      >
        <span className="shrink-0 font-mono text-[10px] font-semibold tabular-nums opacity-80">
          {timeLabel(block.start)}
        </span>
        <span className={cn("text-xs leading-tight font-semibold", compact ? "truncate" : "line-clamp-2")}>
          {activity.title}
        </span>
        {!compact && height >= 80 && activity.location && (
          <span className="mt-0.5 truncate text-[10px] opacity-75">{activity.location}</span>
        )}
      </BlockLink>
    </div>
  );
}

/** A colored block: a link to edit the activity for those who can, plain otherwise. */
function BlockLink({
  tripId,
  activity,
  canManage,
  className,
  children,
}: {
  tripId: string;
  activity: CalendarActivity;
  canManage: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const meta = CATEGORY_META[activity.category];
  const classes = cn(
    "flex min-w-0 overflow-hidden rounded-lg ring-1 ring-inset transition",
    TONES[meta.tone],
    canManage && "hover:shadow-soft hover:brightness-[0.97]",
    className,
  );
  const title = [activity.startTime, activity.title, meta.label, activity.location].filter(Boolean).join(" · ");

  return canManage ? (
    <Link href={`/trips/${tripId}/activities/${activity.id}/edit`} className={classes} title={title}>
      {children}
    </Link>
  ) : (
    <div className={classes} title={title}>
      {children}
    </div>
  );
}

/** "Hay 3 ideas sin día": the calendar only shows scheduled activities. */
export function IdeasNote({ count, href }: { count: number; href: string }) {
  if (count === 0) return null;
  return (
    <p className="flex items-center gap-2 text-sm text-slate-600">
      <Lightbulb className="size-4 text-amber-500" aria-hidden />
      {count === 1 ? "Hay 1 idea sin día." : `Hay ${count} ideas sin día.`}
      <Link href={href} className="font-medium text-brand-700 hover:underline">
        Verlas en la lista
      </Link>
    </p>
  );
}
