"use client";

import { Car, Check, Clock, MapPin, Navigation, MoveRight, PartyPopper } from "lucide-react";
import Image from "next/image";
import { IconTile } from "@/components/ui/icon-tile";
import { CATEGORY_META } from "@/features/activities/categories";
import { formatDistance, formatDuration } from "@/features/routes/format";
import { cn } from "@/lib/cn";
import type { RouteLeg } from "@/server/routes/directions";
import { timelineState, type PlanEntry } from "../day-plan";
import { useNow } from "../use-now";

interface TodayViewProps {
  date: string;
  entries: PlanEntry[];
  /** The destination's time zone; without it, the device's. */
  timeZone: string | null;
}

export function TodayView({ date, entries, timeZone }: TodayViewProps) {
  const now = useNow(timeZone);
  const isToday = now?.date === date;
  const state = timelineState(entries, isToday ? now.minutes : null);
  const next = state.next ? entries[state.next.index] : null;
  const previous = state.next && state.next.index > 0 ? entries[state.next.index - 1] : null;

  return (
    <div className="space-y-6">
      {next ? (
        <NextUp
          entry={next}
          label={
            !isToday
              ? "Primera actividad del día"
              : state.next!.minutesUntil! <= 0
                ? "Ahora"
                : `Próximo · en ${formatDuration(state.next!.minutesUntil!)}`
          }
          legFromPrevious={previous?.legToNext ?? null}
          byRoad={next.legByRoad}
        />
      ) : (
        isToday &&
        entries.length > 0 && (
          <div className="flex items-center gap-3 rounded-3xl bg-linear-to-br from-brand-500 to-brand-700 p-6 text-white shadow-lift">
            <PartyPopper className="size-8 shrink-0" strokeWidth={1.75} aria-hidden />
            <div>
              <p className="font-display text-xl font-semibold">No queda nada más por hoy</p>
              <p className="text-sm text-white/80">Buen descanso. Mañana sigue el viaje.</p>
            </div>
          </div>
        )
      )}

      <section aria-labelledby="timeline-title">
        <h2 id="timeline-title" className="mb-3 text-lg font-semibold text-slate-900">
          La agenda
        </h2>
        <ol className="relative">
          {entries.map((entry, index) => (
            <li key={entry.id}>
              {state.nowBefore === index && now && <NowLine label={now.label} />}
              <TimelineItem
                entry={entry}
                done={state.done.has(entry.id)}
                current={isToday && state.next?.index === index}
                last={index === entries.length - 1}
              />
            </li>
          ))}
          {state.nowBefore === entries.length && now && (
            <li>
              <NowLine label={now.label} />
            </li>
          )}
        </ol>
      </section>
    </div>
  );
}

function NextUp({
  entry,
  label,
  legFromPrevious,
  byRoad,
}: {
  entry: PlanEntry;
  label: string;
  legFromPrevious: RouteLeg | null;
  byRoad: boolean;
}) {
  const category = CATEGORY_META[entry.category];
  const directionsUrl = entry.coordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${entry.coordinates.latitude},${entry.coordinates.longitude}`
    : null;

  return (
    <article className="relative overflow-hidden rounded-3xl bg-slate-900 text-white shadow-lift" aria-live="polite">
      {entry.photoUrl ? (
        <>
          <Image src={entry.photoUrl} alt="" fill sizes="(min-width: 1024px) 720px, 100vw" className="object-cover" />
          <div
            aria-hidden
            className="absolute inset-0 bg-linear-to-t from-slate-950/90 via-slate-950/50 to-slate-950/20"
          />
        </>
      ) : (
        <div aria-hidden className="absolute inset-0 bg-linear-to-br from-brand-500 via-brand-700 to-slate-900" />
      )}
      <div className="relative flex min-h-56 flex-col justify-end gap-3 p-6 sm:p-7">
        <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold tracking-wide uppercase ring-1 ring-white/30 backdrop-blur-sm">
          <Clock className="size-3.5" aria-hidden />
          {label}
        </p>
        <div>
          <h2 className="font-display text-3xl leading-tight font-bold text-balance">{entry.title}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/85">
            {entry.startTime && <span className="font-mono font-semibold">{entry.startTime}</span>}
            <span>{category.label}</span>
            {entry.location && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{entry.location}</span>
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {directionsUrl && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white/90"
            >
              <Navigation className="size-4" aria-hidden />
              Cómo llegar
            </a>
          )}
          {legFromPrevious && (
            <p className="inline-flex items-center gap-1.5 text-sm text-white/85">
              {byRoad ? <Car className="size-4" aria-hidden /> : <MoveRight className="size-4" aria-hidden />}
              {legText(legFromPrevious, byRoad)} desde la parada anterior
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function TimelineItem({
  entry,
  done,
  current,
  last,
}: {
  entry: PlanEntry;
  done: boolean;
  current: boolean;
  last: boolean;
}) {
  const category = CATEGORY_META[entry.category];
  return (
    <div className="relative grid grid-cols-[3.25rem_1.5rem_minmax(0,1fr)] gap-x-2">
      <p
        className={cn(
          "pt-3 text-right font-mono text-sm font-semibold tabular-nums",
          done ? "text-slate-400" : "text-slate-700",
        )}
      >
        {entry.startTime ?? <span className="font-sans text-xs font-normal text-slate-400">—</span>}
      </p>

      {/* The rail: a dot per activity joined by a line. */}
      <div className="relative flex justify-center">
        {!last && <span aria-hidden className="absolute top-6 -bottom-0 w-px bg-slate-200" />}
        <span
          aria-hidden
          className={cn(
            "relative mt-4 flex size-4 items-center justify-center rounded-full ring-4 ring-sand-50",
            done ? "bg-slate-300" : current ? "bg-brand-600" : "border-2 border-brand-500 bg-white",
          )}
        >
          {done && <Check className="size-2.5 text-white" strokeWidth={3} />}
        </span>
      </div>

      <div className="pb-2">
        <div
          className={cn(
            "flex items-center gap-3 rounded-2xl border bg-white p-3 transition",
            current ? "border-brand-300 shadow-lift ring-2 ring-brand-500/20" : "border-slate-200/70 shadow-soft",
            done && "opacity-55",
          )}
        >
          {entry.photoUrl ? (
            <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
              <Image src={entry.photoUrl} alt="" fill sizes="56px" className="object-cover" />
            </div>
          ) : (
            <IconTile icon={category.icon} tone={category.tone} size="lg" />
          )}
          <div className="min-w-0">
            <p className={cn("leading-snug font-semibold text-slate-900", done && "line-through decoration-slate-300")}>
              {entry.title}
              {done && <span className="sr-only"> (hecho)</span>}
            </p>
            <p className="truncate text-xs text-slate-500">
              {category.label}
              {entry.location && ` · ${entry.location}`}
            </p>
          </div>
        </div>
        {entry.legToNext && (
          <p className="my-2 ml-1 inline-flex items-center gap-1.5 rounded-full bg-sand-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {entry.legByRoad ? (
              <Car className="size-3.5" aria-hidden />
            ) : (
              <MoveRight className="size-3.5" aria-hidden />
            )}
            {legText(entry.legToNext, entry.legByRoad)}
          </p>
        )}
      </div>
    </div>
  );
}

function NowLine({ label }: { label: string }) {
  return (
    <div className="relative my-1 grid grid-cols-[3.25rem_1.5rem_minmax(0,1fr)] items-center gap-x-2" role="note">
      <p className="text-right font-mono text-xs font-bold text-coral-600 tabular-nums">{label}</p>
      <span aria-hidden className="mx-auto size-2.5 rounded-full bg-coral-500 ring-4 ring-coral-100" />
      <p className="flex items-center gap-2 text-xs font-bold tracking-wide text-coral-600 uppercase">
        Ahora
        <span aria-hidden className="bg-coral-300 h-px flex-1" />
      </p>
    </div>
  );
}

/** "12 min · 4,2 km en auto" or "4,2 km en línea recta". */
function legText(leg: RouteLeg, byRoad: boolean): string {
  const distance = formatDistance(leg.distanceKm);
  return byRoad && leg.durationMin !== null
    ? `${formatDuration(leg.durationMin)} · ${distance} en auto`
    : `${distance} en línea recta`;
}
