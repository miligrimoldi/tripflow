import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, CardHeading, Skeleton } from "@/components/ui/card";
import { createActivityAction } from "@/features/activities/actions";
import { toBoardSlots } from "@/features/activities/board";
import { ActivityForm } from "@/features/activities/components/activity-form";
import { ItineraryBoard } from "@/features/activities/components/itinerary-board";
import { toDayOptions } from "@/features/activities/day-options";
import { TripHeader } from "@/features/trips/components/trip-header";
import { tripMetadata } from "@/features/trips/metadata";
import { formatDayLong } from "@/lib/format";
import { orNotFound } from "@/lib/page-data";
import { itineraryPoints } from "@/server/activities/activity";
import { requireUser } from "@/server/auth/session";
import { activityService, budgetService, membershipService, placeService, tripService } from "@/server/container";
import { formatMoney } from "@/server/shared/money";
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
  const [{ trip, role }, itinerary, members, activityCosts] = await orNotFound(
    Promise.all([
      tripService.get(user.id, tripId),
      activityService.getItinerary(user.id, tripId),
      membershipService.listMembers(user.id, tripId),
      budgetService.getActivityCosts(user.id, tripId),
    ]),
  );
  // Formatted on the server so client and server render the same text.
  const costs = Object.fromEntries(
    [...activityCosts].map(([activityId, cents]) => [activityId, formatMoney(cents, trip.currency)]),
  );

  const canManage = hasPermission(role, "activity:manage");
  const dayOptions = toDayOptions(trip);
  const near = canManage ? await placeService.tripArea(trip.destination, itineraryPoints(itinerary)) : null;

  return (
    <div className="space-y-8">
      <TripHeader trip={trip} members={members} active="itinerary" />
      <ItineraryBoard
        tripId={trip.id}
        days={itinerary.days.map((day) => ({
          date: day.date,
          dayNumber: day.dayNumber,
          label: formatDayLong(day.date),
        }))}
        slots={toBoardSlots(itinerary)}
        dayOptions={dayOptions}
        canManage={canManage}
        costs={costs}
        sidebar={
          canManage && (
            <Card className="p-5">
              <CardHeading
                icon={Plus}
                title="Agregar actividad"
                description="Con día, o como idea para decidir después."
              />
              <ActivityForm
                action={createActivityAction.bind(null, trip.id)}
                dayOptions={dayOptions}
                near={near}
                submitLabel="Agregar"
              />
            </Card>
          )
        }
      />
    </div>
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
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
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
