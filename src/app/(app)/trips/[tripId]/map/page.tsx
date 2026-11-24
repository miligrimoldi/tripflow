import { Map as MapIcon, MapPinOff, MapPinPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, CardHeading, Skeleton } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TripMap } from "@/features/map/components/trip-map";
import { buildMapData, toMapRoutes } from "@/features/map/map-data";
import { TripHeader } from "@/features/trips/components/trip-header";
import { tripMetadata } from "@/features/trips/metadata";
import { formatDayShort } from "@/lib/format";
import { orNotFound } from "@/lib/page-data";
import { requireUser } from "@/server/auth/session";
import { activityService, directionsService, membershipService, tripService } from "@/server/container";
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
  // Not awaited: the map renders right away and the routes stream in.
  const routes = directionsService.getTripDirections(user.id, tripId).then(toMapRoutes);
  const canManage = hasPermission(role, "activity:manage");

  return (
    <div className="space-y-8">
      <TripHeader trip={trip} members={members} active="map" />

      {groups.length > 0 ? (
        <TripMap groups={groups} routes={routes} focusId={typeof focus === "string" ? focus : undefined} />
      ) : (
        <EmptyState icon={MapIcon} tone="sky" title="Todavía no hay lugares en el mapa">
          Cuando agregues una actividad, buscá su ubicación y elegila de la lista para verla acá.
        </EmptyState>
      )}

      {unlocated.length > 0 && (
        <Card className="p-6">
          <CardHeading
            icon={MapPinOff}
            tone="slate"
            title={`Sin ubicación en el mapa (${unlocated.length})`}
            description={
              canManage
                ? "Editalas y elegí la ubicación de la lista para que aparezcan."
                : "Todavía no tienen ubicación."
            }
            className="mb-3"
          />
          <ul className="divide-y divide-slate-100">
            {unlocated.map((activity) => (
              <li key={activity.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0 truncate text-slate-700">
                  {activity.title}
                  {activity.location && <span className="text-slate-400"> · {activity.location}</span>}
                </span>
                {canManage && (
                  <Link
                    href={`/trips/${trip.id}/activities/${activity.id}/edit`}
                    className="inline-flex shrink-0 items-center gap-1 font-medium text-brand-700 hover:underline"
                  >
                    <MapPinPlus className="size-4" aria-hidden />
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
