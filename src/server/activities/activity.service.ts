import { noTripEvents, type TripEventPublisher } from "../realtime/trip-events";
import type { TripAccessPolicy } from "../members/trip-access";
import type { DateOnly } from "../shared/date-only";
import { NotFoundError, ValidationError } from "../shared/errors";
import { parseInput } from "../shared/validation";
import type { Trip } from "../trips/trip";
import type { TripRepository } from "../trips/trip.repository";
import { buildItinerary, isDateInTrip, planMove, type Activity, type Itinerary, type SlotOrder } from "./activity";
import type { ActivityRepository } from "./activity.repository";
import { activityDetailsSchema, moveSchema, type ActivityDetailsInput, type MoveInput } from "./activity.schemas";

export class ActivityService {
  constructor(
    private readonly activities: ActivityRepository,
    private readonly trips: Pick<TripRepository, "findById">,
    private readonly access: TripAccessPolicy,
    private readonly events: TripEventPublisher = noTripEvents,
  ) {}

  async getItinerary(userId: string, tripId: string): Promise<Itinerary> {
    await this.access.require(tripId, userId, "trip:view");
    const trip = await this.loadTrip(tripId);
    return buildItinerary(trip, await this.activities.listByTrip(tripId));
  }

  async get(userId: string, activityId: string): Promise<Activity> {
    const activity = await this.activities.findById(activityId);
    if (!activity) throw new NotFoundError("Actividad");
    await this.access.require(activity.tripId, userId, "trip:view");
    return activity;
  }

  async create(userId: string, tripId: string, input: ActivityDetailsInput): Promise<Activity> {
    await this.access.require(tripId, userId, "activity:manage");
    const details = parseInput(activityDetailsSchema, input);
    this.assertDateInTrip(details.date, await this.loadTrip(tripId));

    const activity = await this.activities.create({
      ...details,
      tripId,
      createdById: userId,
      position: await this.activities.nextPosition(tripId, details.date),
    });
    await this.events.publish({ tripId, topic: "itinerary", actorId: userId });
    return activity;
  }

  async update(userId: string, activityId: string, input: ActivityDetailsInput): Promise<Activity> {
    const current = await this.loadManageable(userId, activityId);
    const details = parseInput(activityDetailsSchema, input);
    this.assertDateInTrip(details.date, await this.loadTrip(current.tripId));

    const position =
      details.date === current.date
        ? current.position
        : await this.activities.nextPosition(current.tripId, details.date);
    const activity = await this.activities.update(activityId, { ...details, position });
    await this.events.publish({ tripId: current.tripId, topic: "itinerary", actorId: userId });
    return activity;
  }

  /**
   * Moves an activity to a day of the itinerary (or back to ideas with
   * `date: null`), at `index` inside that day. Without `index` it is appended
   * at the end. Covers reordering within a day as well.
   */
  async move(userId: string, activityId: string, input: MoveInput): Promise<void> {
    const { date, index } = parseInput(moveSchema, input);
    const current = await this.loadManageable(userId, activityId);
    this.assertDateInTrip(date, await this.loadTrip(current.tripId));

    const [from, to] = await Promise.all([
      this.slotOrder(current.tripId, current.date),
      date === current.date ? null : this.slotOrder(current.tripId, date),
    ]);
    await this.activities.saveOrder(planMove({ activityId, from, to: to ?? from, index }));
    await this.events.publish({ tripId: current.tripId, topic: "itinerary", actorId: userId });
  }

  async delete(userId: string, activityId: string): Promise<{ tripId: string }> {
    const current = await this.loadManageable(userId, activityId);
    await this.activities.delete(activityId);
    await this.events.publish({ tripId: current.tripId, topic: "itinerary", actorId: userId });
    return { tripId: current.tripId };
  }

  private async loadManageable(userId: string, activityId: string): Promise<Activity> {
    const activity = await this.activities.findById(activityId);
    if (!activity) throw new NotFoundError("Actividad");
    await this.access.require(activity.tripId, userId, "activity:manage");
    return activity;
  }

  private async slotOrder(tripId: string, date: DateOnly | null): Promise<SlotOrder> {
    const activities = await this.activities.listBySlot(tripId, date);
    return { date, activityIds: activities.map((activity) => activity.id) };
  }

  private async loadTrip(tripId: string): Promise<Trip> {
    const trip = await this.trips.findById(tripId);
    if (!trip) throw new NotFoundError("Viaje");
    return trip;
  }

  private assertDateInTrip(date: DateOnly | null, trip: Trip): void {
    if (date !== null && !isDateInTrip(date, trip)) {
      throw new ValidationError("La fecha está fuera del viaje", {
        date: ["Elegí un día dentro de las fechas del viaje"],
      });
    }
  }
}
