"use client";

import { Car, MoveRight } from "lucide-react";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import { formatDistance, formatDuration } from "@/features/routes/format";
import { coverTexture } from "@/features/trips/trip-visuals";
import { cn } from "@/lib/cn";

/** A day's route, summarized for its banner. */
export interface DayRouteSummary {
  distanceKm: number;
  /** Known only along the streets. */
  durationMin: number | null;
}

interface DayBannerProps {
  dayNumber: number;
  label: string;
  activityCount: number;
  /** The most representative place of the day, when there's a reliable photo. */
  photoUrl: string | null;
  route: DayRouteSummary | null;
  /** E.g. the "Optimizar recorrido" button. */
  action?: ReactNode;
}

/**
 * A day's header: a photo of its main place (or the brand gradient while
 * there's none), its date and a summary. Same size with or without a photo,
 * so the itinerary doesn't jump when photos arrive.
 */
export function DayBanner({ dayNumber, label, activityCount, photoUrl, route, action }: DayBannerProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative isolate flex min-h-32 overflow-hidden rounded-2xl bg-linear-to-br from-brand-500 via-brand-600 to-brand-800 shadow-soft sm:min-h-36">
      <div aria-hidden className={cn("absolute inset-0 -z-10", coverTexture)} />
      {photoUrl && (
        <Image
          key={photoUrl}
          src={photoUrl}
          alt=""
          fill
          sizes="(min-width: 1024px) 720px, 100vw"
          onLoad={() => setLoaded(true)}
          className={cn("-z-10 object-cover transition-opacity duration-700", loaded ? "opacity-100" : "opacity-0")}
        />
      )}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-t from-slate-950/75 via-slate-950/30 to-slate-950/5"
      />

      <div className="flex w-full flex-wrap items-end justify-between gap-x-4 gap-y-3 self-end p-4 sm:p-5">
        <div className="min-w-0 text-white">
          <h3 className="font-display text-xl leading-tight font-semibold text-balance drop-shadow-sm sm:text-2xl">
            <span className="sr-only">Día {dayNumber}: </span>
            {label}
          </h3>
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-medium">
            <span className="rounded-full bg-white/20 px-2 py-0.5 ring-1 ring-white/25 backdrop-blur-sm ring-inset">
              {activityCount === 0
                ? "Día libre"
                : `${activityCount} ${activityCount === 1 ? "actividad" : "actividades"}`}
            </span>
            {route && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 ring-1 ring-white/25 backdrop-blur-sm ring-inset">
                {route.durationMin !== null ? (
                  <>
                    <Car className="size-3.5" aria-hidden />
                    {formatDuration(route.durationMin)} en auto · {formatDistance(route.distanceKm)}
                  </>
                ) : (
                  <>
                    <MoveRight className="size-3.5" aria-hidden />
                    {formatDistance(route.distanceKm)} de recorrido
                  </>
                )}
              </span>
            )}
          </p>
        </div>
        {action}
      </div>
    </div>
  );
}
