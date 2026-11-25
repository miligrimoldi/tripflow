import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TripMap } from "@/features/map/components/trip-map";
import { buildMapData, toMapRoutes } from "@/features/map/map-data";
import { buildDayPlan, pickDay } from "@/features/today/day-plan";
import { TodayView } from "@/features/today/components/today-view";
import { WeatherBadge } from "@/features/today/components/weather-badge";
import { TripHeader } from "@/features/trips/components/trip-header";
import { tripMetadata } from "@/features/trips/metadata";
import { cn } from "@/lib/cn";
import { formatDayLong, formatDayShort } from "@/lib/format";
import { orNotFound } from "@/lib/page-data";
import { itineraryPoints } from "@/server/activities/activity";
import { requireUser } from "@/server/auth/session";
import {
  activityPhotoService,
  activityService,
  directionsService,
  membershipService,
  placeService,
  tripService,
  weatherService,
} from "@/server/container";
import { todayIn } from "@/server/shared/date-only";

type Props = PageProps<"/trips/[tripId]/today">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return tripMetadata((await params).tripId, "Hoy");
}

export default function TodayPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-[70vh]" />}>
      <Today params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Today({ params, searchParams }: Props) {
  const [{ tripId }, { date: requested }] = await Promise.all([params, searchParams]);
  const user = await requireUser(`/trips/${tripId}/today`);
  const [{ trip }, itinerary, members] = await orNotFound(
    Promise.all([
      tripService.get(user.id, tripId),
      activityService.getItinerary(user.id, tripId),
      membershipService.listMembers(user.id, tripId),
    ]),
  );

  // The forecast also tells the destination's time zone, so "today" is the
  // trip's today (not the server's, which runs in UTC).
  const forecast = await weatherService.forecast(
    await placeService.tripArea(trip.destination, itineraryPoints(itinerary)),
  );
  const date = pickDay(trip, requested, todayIn(forecast?.timeZone ?? null));
  const dayIndex = itinerary.days.findIndex((day) => day.date === date);
  const day = itinerary.days[dayIndex];
  const weather = forecast?.days.find((forecastDay) => forecastDay.date === date) ?? null;

  const [directions, photos] = await Promise.all([
    directionsService.getDayDirections(user.id, tripId, date),
    activityPhotoService.photosFor(day.activities, trip.destination),
  ]);
  const entries = buildDayPlan(day.activities, directions, photos);
  const dayMap = buildMapData({ days: [day], ideas: [] }, formatDayShort).groups;

  const previous = itinerary.days[dayIndex - 1];
  const next = itinerary.days[dayIndex + 1];
  const place = trip.destination.split(",")[0];

  return (
    <div className="space-y-6">
      <TripHeader trip={trip} members={members} active="today" />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Días del viaje" className="flex items-center gap-2">
          <DayLink tripId={trip.id} day={previous} direction="previous" />
          <div className="px-1 text-center">
            <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">
              Día {day.dayNumber} de {itinerary.days.length}
            </p>
            <h2 className="font-display text-2xl font-bold text-slate-900">{formatDayLong(date)}</h2>
          </div>
          <DayLink tripId={trip.id} day={next} direction="next" />
        </nav>
        {weather && <WeatherBadge weather={weather} place={place} />}
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={CalendarPlus}
          title="Día libre"
          action={
            <ButtonLink href={`/trips/${trip.id}`} variant="secondary">
              Ir al itinerario
            </ButtonLink>
          }
        >
          No hay nada planeado para este día. Podés sumar algo desde el itinerario o pasar una idea a este día.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <TodayView date={date} entries={entries} timeZone={forecast?.timeZone ?? null} />
          {dayMap.length > 0 && (
            <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start" aria-label="Mapa del día">
              <h2 className="text-lg font-semibold text-slate-900">El recorrido</h2>
              <TripMap groups={dayMap} routes={Promise.resolve(toMapRoutes(directions ? [directions] : []))} compact />
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

function DayLink({
  tripId,
  day,
  direction,
}: {
  tripId: string;
  day: { date: string; dayNumber: number } | undefined;
  direction: "previous" | "next";
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  const className =
    "flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs transition";
  if (!day) {
    return (
      <span aria-hidden className={cn(className, "opacity-40")}>
        <Icon className="size-5" />
      </span>
    );
  }
  return (
    <Link
      href={`/trips/${tripId}/today?date=${day.date}`}
      aria-label={`${direction === "previous" ? "Día anterior" : "Día siguiente"}: día ${day.dayNumber}`}
      className={cn(className, "hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900")}
    >
      <Icon className="size-5" aria-hidden />
    </Link>
  );
}
