import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, CardHeading, Skeleton } from "@/components/ui/card";
import { createActivityAction } from "@/features/activities/actions";
import { toBoardSlots } from "@/features/activities/board";
import { ActivityForm } from "@/features/activities/components/activity-form";
import { ItineraryBoard } from "@/features/activities/components/itinerary-board";
import { ViewToggle } from "@/features/activities/components/view-toggle";
import { toDayOptions } from "@/features/activities/day-options";
import { IdeasNote, TripCalendar } from "@/features/calendar/components/trip-calendar";
import { summarizeDayRoutes } from "@/features/activities/day-routes";
import { toDiscussionViews } from "@/features/discussions/view";
import { TripHeader } from "@/features/trips/components/trip-header";
import { tripMetadata } from "@/features/trips/metadata";
import { formatDayLong, formatDayShort, formatWeekdayShort } from "@/lib/format";
import { orNotFound } from "@/lib/page-data";
import { itineraryPoints } from "@/server/activities/activity";
import { requireUser } from "@/server/auth/session";
import {
  activityPhotoService,
  activityService,
  budgetService,
  directionsService,
  discussionService,
  membershipService,
  placeService,
  tripService,
  weatherService,
} from "@/server/container";
import { dateOnlyFromDate } from "@/server/shared/date-only";
import { tripTiming } from "@/server/trips/trip";
import { mostVoted } from "@/server/discussions/discussion";
import { formatMoney } from "@/server/shared/money";
import { hasPermission } from "@/server/members/member";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return tripMetadata((await params).tripId);
}

type Props = PageProps<"/trips/[tripId]">;

export default function TripPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<TripPageSkeleton />}>
      <TripPlanner params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function TripPlanner({ params, searchParams }: Props) {
  const [{ tripId }, { view }] = await Promise.all([params, searchParams]);
  return view === "calendar" ? <CalendarPlanner tripId={tripId} /> : <ListPlanner tripId={tripId} />;
}

/** The whole trip as a calendar: one column per day, activities at their time. */
async function CalendarPlanner({ tripId }: { tripId: string }) {
  const user = await requireUser(`/trips/${tripId}?view=calendar`);
  const [{ trip, role }, itinerary, members] = await orNotFound(
    Promise.all([
      tripService.get(user.id, tripId),
      activityService.getItinerary(user.id, tripId),
      membershipService.listMembers(user.id, tripId),
    ]),
  );
  // While traveling, the "now" line uses the destination's time zone (it
  // comes with the forecast, cached for an hour).
  const ongoing = tripTiming(trip, dateOnlyFromDate(new Date())).kind === "ongoing";
  const forecast = ongoing
    ? await weatherService.forecast(await placeService.tripArea(trip.destination, itineraryPoints(itinerary)))
    : null;

  return (
    <div className="space-y-6">
      <TripHeader trip={trip} members={members} active="itinerary" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ViewToggle tripId={trip.id} active="calendar" />
        <IdeasNote count={itinerary.ideas.length} href={`/trips/${trip.id}`} />
      </div>
      <TripCalendar
        tripId={trip.id}
        canManage={hasPermission(role, "activity:manage")}
        timeZone={forecast?.timeZone ?? null}
        days={itinerary.days.map((day) => ({
          date: day.date,
          dayNumber: day.dayNumber,
          weekday: formatWeekdayShort(day.date),
          dayLabel: formatDayShort(day.date),
          activities: day.activities.map(({ id, title, category, startTime, location }) => ({
            id,
            title,
            category,
            startTime,
            location,
          })),
        }))}
      />
    </div>
  );
}

async function ListPlanner({ tripId }: { tripId: string }) {
  const user = await requireUser(`/trips/${tripId}`);
  const [{ trip, role }, itinerary, members, activityCosts, discussions] = await orNotFound(
    Promise.all([
      tripService.get(user.id, tripId),
      activityService.getItinerary(user.id, tripId),
      membershipService.listMembers(user.id, tripId),
      budgetService.getActivityCosts(user.id, tripId),
      discussionService.getForTrip(user.id, tripId),
    ]),
  );
  // Formatted on the server so client and server render the same text.
  const costs = Object.fromEntries(
    [...activityCosts].map(([activityId, cents]) => [activityId, formatMoney(cents, trip.currency)]),
  );

  const canManage = hasPermission(role, "activity:manage");
  const dayOptions = toDayOptions(trip);
  // Not awaited: the itinerary renders right away and these stream in (the
  // first time, finding photos and routes takes a few seconds).
  const photos = activityPhotoService.photosFor(
    [...itinerary.days.flatMap((day) => day.activities), ...itinerary.ideas],
    trip.destination,
  );
  const dayRoutes = directionsService.getTripDirections(user.id, tripId).then(summarizeDayRoutes);

  const near = canManage ? await placeService.tripArea(trip.destination, itineraryPoints(itinerary)) : null;

  return (
    <div className="space-y-8">
      <TripHeader trip={trip} members={members} active="itinerary" />
      <ViewToggle tripId={trip.id} active="list" />
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
        photos={photos}
        dayRoutes={dayRoutes}
        discussions={toDiscussionViews(discussions)}
        canDiscuss={hasPermission(role, "activity:discuss")}
        mostVotedId={mostVoted(
          itinerary.ideas.map((idea) => idea.id),
          discussions,
        )}
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
