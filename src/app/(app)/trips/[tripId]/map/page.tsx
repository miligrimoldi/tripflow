import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, Skeleton } from "@/components/ui/card";
import { TripMap } from "@/features/map/components/trip-map";
import { buildMapData } from "@/features/map/map-data";
import { TripHeader } from "@/features/trips/components/trip-header";
import { tripMetadata } from "@/features/trips/metadata";
import { formatDayShort } from "@/lib/format";
import { orNotFound } from "@/lib/page-data";
import { requireUser } from "@/server/auth/session";
import { activityService, membershipService, tripService } from "@/server/container";
import { hasPermission } from "@/server/members/member";

type Props = PageProps<"/trips/[tripId]/map">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return tripMetadata((await params).tripId, "Mapa");
}

export default function TripMapPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-[70vh]" />}>
      <TripMapView params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function TripMapView({ params, searchParams }: Props) {
  const [{ tripId }, { focus }] = await Promise.all([params, searchParams]);
  const user = await requireUser(`/trips/${tripId}/map`);
  const [{ trip, role }, itinerary, members] = await orNotFound(
    Promise.all([
      tripService.get(user.id, tripId),
      activityService.getItinerary(user.id, tripId),
      membershipService.listMembers(user.id, tripId),
    ]),
  );

  const { groups, unlocated } = buildMapData(itinerary, formatDayShort);
  const canManage = hasPermission(role, "activity:manage");

  return (
    <div className="space-y-8">
      <TripHeader trip={trip} members={members} active="map" />

      {groups.length > 0 ? (
        <TripMap groups={groups} focusId={typeof focus === "string" ? focus : undefined} />
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 px-6 py-16 text-center">
          <span className="text-5xl" aria-hidden>
            🗺️
          </span>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Todavía no hay lugares en el mapa</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
            Cuando agregues una actividad, buscá su ubicación y elegila de la lista para verla acá.
          </p>
        </div>
      )}

      {unlocated.length > 0 && (
        <Card className="p-5">
          <h2 className="font-semibold text-slate-900">Sin ubicación en el mapa ({unlocated.length})</h2>
          <p className="mb-3 text-xs text-slate-500">
            {canManage
              ? "Editalas y elegí la ubicación de la lista para que aparezcan."
              : "Todavía no tienen ubicación."}
          </p>
          <ul className="divide-y divide-slate-100">
            {unlocated.map((activity) => (
              <li key={activity.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate text-slate-700">
                  {activity.title}
                  {activity.location && <span className="text-slate-400"> · {activity.location}</span>}
                </span>
                {canManage && (
                  <Link
                    href={`/trips/${trip.id}/activities/${activity.id}/edit`}
                    className="shrink-0 font-medium text-brand-700 hover:underline"
                  >
                    Agregar ubicación
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
