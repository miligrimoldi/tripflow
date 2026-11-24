import type { ActivityRepository } from "../activities/activity.repository";
import { buildItinerary } from "../activities/activity";
import type { TripAccessPolicy } from "../members/trip-access";
import type { DateOnly } from "../shared/date-only";
import { NotFoundError } from "../shared/errors";
import type { TripRepository } from "../trips/trip.repository";
import type { Directions, DirectionsProvider } from "./directions";

/** How to go through one day's stops, in the itinerary's order. */
export interface DayDirections extends Directions {
  date: DateOnly;
  /** Ids of the located activities, in visiting order (`legs[i]` joins stop i and i + 1). */
  stopIds: string[];
}

export class DirectionsService {
  constructor(
    private readonly activities: Pick<ActivityRepository, "listByTrip">,
    private readonly trips: Pick<TripRepository, "findById">,
    private readonly provider: DirectionsProvider,
    private readonly access: TripAccessPolicy,
  ) {}

  /**
   * Route of every day that has at least two stops on the map. Activities
   * without a location are skipped: the route goes from one located stop to
   * the next.
   */
  async getTripDirections(userId: string, tripId: string): Promise<DayDirections[]> {
    await this.access.require(tripId, userId, "trip:view");
    const trip = await this.trips.findById(tripId);
    if (!trip) throw new NotFoundError("Viaje");

    const itinerary = buildItinerary(trip, await this.activities.listByTrip(tripId));
    const result: DayDirections[] = [];
    // One day at a time: routing APIs are rate-limited and a trip has few days.
    for (const day of itinerary.days) {
      const stops = day.activities.flatMap((activity) =>
        activity.coordinates ? [{ id: activity.id, coordinates: activity.coordinates }] : [],
      );
      if (stops.length < 2) continue;

      const directions = await this.provider.directions(stops.map((stop) => stop.coordinates));
      result.push({ date: day.date, stopIds: stops.map((stop) => stop.id), ...directions });
    }
    return result;
  }
}
