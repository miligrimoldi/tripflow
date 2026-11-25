import { noTripEvents, type TripEventPublisher } from "../realtime/trip-events";
import { z } from "zod";
import type { ActivityRepository } from "../activities/activity.repository";
import type { TripAccessPolicy } from "../members/trip-access";
import { BusinessRuleError, NotFoundError, ValidationError } from "../shared/errors";
import { dateOnlySchema } from "../shared/schemas";
import { parseInput, type RawInput } from "../shared/validation";
import { isDateInTrip } from "../activities/activity";
import type { TripRepository } from "../trips/trip.repository";
import { planDayRoute } from "./route-optimizer";
import type { TravelCostMatrix, TravelCostProvider } from "./travel-cost";

import { MIN_STOPS_TO_OPTIMIZE } from "./constants";

const daySchema = z.object({ date: dateOnlySchema("el día") });
const applySchema = daySchema.extend({
  order: z.array(z.string().min(1).max(50)).min(1).max(200),
});

export type DayRouteInput = RawInput<typeof daySchema>;
export type ApplyRouteInput = RawInput<typeof applySchema>;

export interface RouteStop {
  id: string;
  title: string;
  startTime: string | null;
  located: boolean;
}

export type RouteSuggestion =
  | { kind: "not-enough"; located: number }
  | {
      kind: "plan";
      date: string;
      /** Every activity of the day, in the suggested order. */
      stops: RouteStop[];
      currentCost: number;
      suggestedCost: number;
      unit: TravelCostMatrix["unit"];
      source: TravelCostMatrix["source"];
      changed: boolean;
      unlocated: number;
    };

export class RouteService {
  constructor(
    private readonly activities: Pick<ActivityRepository, "listBySlot" | "saveOrder">,
    private readonly trips: Pick<TripRepository, "findById">,
    private readonly travel: TravelCostProvider,
    private readonly access: TripAccessPolicy,
    private readonly events: TripEventPublisher = noTripEvents,
  ) {}

  /** Suggests a shorter order for one day. Nothing is saved until {@link applyDayRoute}. */
  async suggestDayRoute(userId: string, tripId: string, input: DayRouteInput): Promise<RouteSuggestion> {
    const { date } = parseInput(daySchema, input);
    await this.authorize(userId, tripId, date);

    const day = await this.activities.listBySlot(tripId, date);
    const located = day.filter((activity) => activity.coordinates);
    if (located.length < MIN_STOPS_TO_OPTIMIZE) return { kind: "not-enough", located: located.length };

    const matrix = await this.travel.matrix(located.map((activity) => activity.coordinates!));
    const plan = planDayRoute(
      day.map((activity) => ({ id: activity.id, located: !!activity.coordinates, startTime: activity.startTime })),
      matrix.values,
    );

    const byId = new Map(day.map((activity) => [activity.id, activity]));
    return {
      kind: "plan",
      date,
      stops: plan.order.map((id) => {
        const activity = byId.get(id)!;
        return { id, title: activity.title, startTime: activity.startTime, located: !!activity.coordinates };
      }),
      currentCost: plan.currentCost,
      suggestedCost: plan.suggestedCost,
      unit: matrix.unit,
      source: matrix.source,
      changed: plan.changed,
      unlocated: day.length - located.length,
    };
  }

  /**
   * Saves an order for the day. It must contain exactly the day's current
   * activities: if someone changed the day meanwhile, the suggestion is stale.
   */
  async applyDayRoute(userId: string, tripId: string, input: ApplyRouteInput): Promise<void> {
    const { date, order } = parseInput(applySchema, input);
    await this.authorize(userId, tripId, date);

    const current = (await this.activities.listBySlot(tripId, date)).map((activity) => activity.id);
    const sameActivities =
      order.length === current.length &&
      new Set(order).size === order.length &&
      order.every((id) => current.includes(id));
    if (!sameActivities) {
      throw new BusinessRuleError("El día cambió mientras tanto. Volvé a calcular el recorrido.");
    }
    await this.activities.saveOrder([{ date, activityIds: order }]);
    await this.events.publish({ tripId, topic: "itinerary", actorId: userId });
  }

  private async authorize(userId: string, tripId: string, date: string): Promise<void> {
    await this.access.require(tripId, userId, "activity:manage");
    const trip = await this.trips.findById(tripId);
    if (!trip) throw new NotFoundError("Viaje");
    if (!isDateInTrip(date, trip)) {
      throw new ValidationError("La fecha está fuera del viaje", { date: ["Elegí un día del viaje"] });
    }
  }
}
