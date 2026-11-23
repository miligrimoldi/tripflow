import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, Skeleton } from "@/components/ui/card";
import { createActivityAction } from "@/features/activities/actions";
import { ActivityCard } from "@/features/activities/components/activity-card";
import { ActivityForm, type DayOption } from "@/features/activities/components/activity-form";
import { toDayOptions } from "@/features/activities/day-options";
import { TripHeader } from "@/features/trips/components/trip-header";
import { tripMetadata } from "@/features/trips/metadata";
import { formatDayLong } from "@/lib/format";
import { orNotFound } from "@/lib/page-data";
import type { Activity } from "@/server/activities/activity";
import { requireUser } from "@/server/auth/session";
import { activityService, membershipService, tripService } from "@/server/container";
import { hasPermission } from "@/server/members/member";

export async function generateMetadata({ params }: PageProps<"/trips/[tripId]">): Promise<Metadata> {
  return tripMetadata((await params).tripId);
}

export default function TripPage({ params }: PageProps<"/trips/[tripId]">) {
  return (
    <Suspense fallback={<TripPageSkeleton />}>
      <TripPlanner params={params} />
    </Suspense>
  );
}

async function TripPlanner({ params }: Pick<PageProps<"/trips/[tripId]">, "params">) {
  const { tripId } = await params;
  const user = await requireUser(`/trips/${tripId}`);
  const [{ trip, role }, itinerary, members] = await orNotFound(
    Promise.all([
      tripService.get(user.id, tripId),
      activityService.getItinerary(user.id, tripId),
      membershipService.listMembers(user.id, tripId),
    ]),
  );

  const canManage = hasPermission(role, "activity:manage");
  const dayOptions = toDayOptions(trip);

  return (
    <div className="space-y-8">
      <TripHeader trip={trip} members={members} active="itinerary" />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-labelledby="itinerary-title" className="space-y-6">
          <h2 id="itinerary-title" className="sr-only">
            Itinerario
          </h2>
          {itinerary.days.map((day) => (
            <div key={day.date} className="space-y-3">
              <h3 className="flex items-baseline gap-3">
                <span className="rounded-md bg-brand-600 px-2 py-0.5 text-sm font-semibold text-white">
                  Día {day.dayNumber}
                </span>
                <span className="font-medium text-slate-700">{formatDayLong(day.date)}</span>
              </h3>
              {day.activities.length > 0 ? (
                <ActivityList activities={day.activities} dayOptions={dayOptions} canManage={canManage} />
              ) : (
                <p className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-slate-500">
                  Nada planeado todavía. Agregá una actividad o mové una idea a este día.
                </p>
              )}
            </div>
          ))}
        </section>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          {canManage && (
            <Card className="p-5">
              <h2 className="mb-4 font-semibold text-slate-900">Agregar actividad</h2>
              <ActivityForm
                action={createActivityAction.bind(null, trip.id)}
                dayOptions={dayOptions}
                submitLabel="Agregar"
              />
            </Card>
          )}

          <section aria-labelledby="ideas-title" className="space-y-3">
            <div>
              <h2 id="ideas-title" className="font-semibold text-slate-900">
                💡 Ideas <span className="text-slate-500">({itinerary.ideas.length})</span>
              </h2>
              <p className="text-xs text-slate-500">Lugares y planes que todavía no tienen día.</p>
            </div>
            {itinerary.ideas.length > 0 ? (
              <ActivityList activities={itinerary.ideas} dayOptions={dayOptions} canManage={canManage} />
            ) : (
              <p className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-slate-500">
                Sin ideas guardadas. ¿Algún restaurante o excursión que les interese?
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function ActivityList({
  activities,
  dayOptions,
  canManage,
}: {
  activities: Activity[];
  dayOptions: DayOption[];
  canManage: boolean;
}) {
  return (
    <ol className="space-y-3">
      {activities.map((activity, index) => (
        <li key={activity.id}>
          <ActivityCard
            activity={activity}
            dayOptions={dayOptions}
            canManage={canManage}
            isFirst={index === 0}
            isLast={index === activities.length - 1}
          />
        </li>
      ))}
    </ol>
  );
}

function TripPageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}
