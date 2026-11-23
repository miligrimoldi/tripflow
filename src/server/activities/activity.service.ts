import type { TripAccessPolicy } from "../members/trip-access";
import type { DateOnly } from "../shared/date-only";
import { NotFoundError, ValidationError } from "../shared/errors";
import { parseInput } from "../shared/validation";
import type { Trip } from "../trips/trip";
import type { TripRepository } from "../trips/trip.repository";
import {
  buildItinerary,
  isDateInTrip,
  reorder,
  toDetails,
  type Activity,
  type Itinerary,
  type MoveDirection,
} from "./activity";
import type { ActivityRepository } from "./activity.repository";
import {
  activityDetailsSchema,
  scheduleSchema,
  type ActivityDetailsInput,
  type ScheduleInput,
} from "./activity.schemas";

export class ActivityService {
  constructor(
    private readonly activities: ActivityRepository,
    private readonly trips: Pick<TripRepository, "findById">,
    private readonly access: TripAccessPolicy,
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

    return this.activities.create({
      ...details,
      tripId,
      createdById: userId,
      position: await this.activities.nextPosition(tripId, details.date),
    });
  }

  async update(userId: string, activityId: string, input: ActivityDetailsInput): Promise<Activity> {
    const current = await this.loadManageable(userId, activityId);
    const details = parseInput(activityDetailsSchema, input);
    this.assertDateInTrip(details.date, await this.loadTrip(current.tripId));

    const position =
      details.date === current.date
        ? current.position
        : await this.activities.nextPosition(current.tripId, details.date);
    return this.activities.update(activityId, { ...details, position });
  }

  /** Moves an activity to a day of the itinerary, or back to ideas (`date: null`). */
  async schedule(userId: string, activityId: string, input: ScheduleInput): Promise<Activity> {
    const { date } = parseInput(scheduleSchema, input);
    const current = await this.loadManageable(userId, activityId);
    if (date === current.date) return current;

    this.assertDateInTrip(date, await this.loadTrip(current.tripId));
    return this.activities.update(activityId, {
      ...toDetails(current),
      date,
      position: await this.activities.nextPosition(current.tripId, date),
    });
  }

  /** Moves an activity one slot up or down inside its day / the ideas board. */
  async move(userId: string, activityId: string, direction: MoveDirection): Promise<void> {
    const current = await this.loadManageable(userId, activityId);
    const siblings = await this.activities.listBySlot(current.tripId, current.date);
    const newOrder = reorder(siblings, activityId, direction);
    if (newOrder) await this.activities.setOrder(newOrder);
  }

  async delete(userId: string, activityId: string): Promise<{ tripId: string }> {
    const current = await this.loadManageable(userId, activityId);
    await this.activities.delete(activityId);
    return { tripId: current.tripId };
  }

  private async loadManageable(userId: string, activityId: string): Promise<Activity> {
    const activity = await this.activities.findById(activityId);
    if (!activity) throw new NotFoundError("Actividad");
    await this.access.require(activity.tripId, userId, "activity:manage");
    return activity;
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
