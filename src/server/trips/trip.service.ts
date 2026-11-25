import { noTripEvents, type TripEventPublisher } from "../realtime/trip-events";
import type { ActivityRepository } from "../activities/activity.repository";
import type { CoverService } from "../covers/cover.service";
import type { MemberRole } from "../members/member";
import type { TripAccessPolicy } from "../members/trip-access";
import { NotFoundError } from "../shared/errors";
import { parseInput } from "../shared/validation";
import type { Trip, TripSummary } from "./trip";
import type { TripRepository } from "./trip.repository";
import { tripDetailsSchema, type TripDetailsInput } from "./trip.schemas";

export interface TripView {
  trip: Trip;
  role: MemberRole;
}

export class TripService {
  constructor(
    private readonly trips: TripRepository,
    // Only the capability we need (Interface Segregation).
    private readonly activities: Pick<ActivityRepository, "unscheduleOutsideRange">,
    private readonly covers: Pick<CoverService, "discard">,
    private readonly access: TripAccessPolicy,
    private readonly events: TripEventPublisher = noTripEvents,
  ) {}

  listForUser(userId: string): Promise<TripSummary[]> {
    return this.trips.listForUser(userId);
  }

  async get(userId: string, tripId: string): Promise<TripView> {
    const member = await this.access.require(tripId, userId, "trip:view");
    const trip = await this.trips.findById(tripId);
    if (!trip) throw new NotFoundError("Viaje");
    return { trip, role: member.role };
  }

  async create(userId: string, input: TripDetailsInput): Promise<Trip> {
    const details = parseInput(tripDetailsSchema, input);
    return this.trips.createWithOwner(details, userId);
  }

  async update(userId: string, tripId: string, input: TripDetailsInput): Promise<Trip> {
    await this.access.require(tripId, userId, "trip:edit");
    const details = parseInput(tripDetailsSchema, input);

    const trip = await this.trips.update(tripId, details);
    // Shortening a trip must not lose plans: activities on removed days go
    // back to the ideas board.
    await this.activities.unscheduleOutsideRange(tripId, trip.startDate, trip.endDate);
    await this.events.publish({ tripId, topic: "trip", actorId: userId });
    return trip;
  }

  async delete(userId: string, tripId: string): Promise<void> {
    await this.access.require(tripId, userId, "trip:delete");
    const trip = await this.trips.findById(tripId);
    await this.trips.delete(tripId);
    // Its uploaded photo would otherwise stay in storage forever.
    await this.covers.discard(trip?.coverImageUrl ?? null);
    // Whoever is looking at it gets sent away (the trip no longer exists).
    await this.events.publish({ tripId, topic: "trip", actorId: userId });
  }
}
