import { noTripEvents, type TripEventPublisher } from "../realtime/trip-events";
import type { ActivityRepository } from "../activities/activity.repository";
import type { MembershipRepository } from "../members/member.repository";
import type { TripAccessPolicy } from "../members/trip-access";
import { NotFoundError, ValidationError } from "../shared/errors";
import { parseInput } from "../shared/validation";
import type { Trip } from "../trips/trip";
import type { TripRepository } from "../trips/trip.repository";
import {
  costsByActivity,
  priceInTripCurrency,
  summarizeBudget,
  type BudgetSummary,
  type Expense,
  type ExpenseDetails,
} from "./expense";
import type { ExpenseRepository } from "./expense.repository";
import { budgetSettingsSchema, expenseSchema, type BudgetSettingsInput, type ExpenseInput } from "./expense.schemas";

export interface BudgetOverview {
  trip: Trip;
  expenses: Expense[];
  summary: BudgetSummary;
}

export class BudgetService {
  constructor(
    private readonly expenses: ExpenseRepository,
    private readonly trips: Pick<TripRepository, "findById" | "updateBudgetSettings">,
    private readonly activities: Pick<ActivityRepository, "findById">,
    private readonly members: Pick<MembershipRepository, "listByTrip">,
    private readonly access: TripAccessPolicy,
    private readonly events: TripEventPublisher = noTripEvents,
  ) {}

  async getOverview(userId: string, tripId: string): Promise<BudgetOverview> {
    await this.access.require(tripId, userId, "trip:view");
    const [trip, expenses, members] = await Promise.all([
      this.loadTrip(tripId),
      this.expenses.listByTrip(tripId),
      this.members.listByTrip(tripId),
    ]);
    return { trip, expenses, summary: summarizeBudget(expenses, trip.budgetCents, members.length) };
  }

  /** Estimated cost per activity id, to show it on the itinerary. */
  async getActivityCosts(userId: string, tripId: string): Promise<Map<string, number>> {
    await this.access.require(tripId, userId, "trip:view");
    return costsByActivity(await this.expenses.listByTrip(tripId));
  }

  async getExpense(userId: string, expenseId: string): Promise<Expense> {
    const expense = await this.expenses.findById(expenseId);
    if (!expense) throw new NotFoundError("Gasto");
    await this.access.require(expense.tripId, userId, "trip:view");
    return expense;
  }

  async addExpense(userId: string, tripId: string, input: ExpenseInput): Promise<Expense> {
    await this.access.require(tripId, userId, "expense:manage");
    const details = await this.toDetails(input, tripId);
    const expense = await this.expenses.create({ ...details, tripId, createdById: userId });
    await this.events.publish({ tripId, topic: "budget", actorId: userId });
    return expense;
  }

  async updateExpense(userId: string, expenseId: string, input: ExpenseInput): Promise<Expense> {
    const current = await this.loadManageable(userId, expenseId);
    const details = await this.toDetails(input, current.tripId);
    const expense = await this.expenses.update(expenseId, details);
    await this.events.publish({ tripId: current.tripId, topic: "budget", actorId: userId });
    return expense;
  }

  async deleteExpense(userId: string, expenseId: string): Promise<{ tripId: string }> {
    const current = await this.loadManageable(userId, expenseId);
    await this.expenses.delete(expenseId);
    await this.events.publish({ tripId: current.tripId, topic: "budget", actorId: userId });
    return { tripId: current.tripId };
  }

  /** Currency and total budget are trip settings: only the organizer changes them. */
  async updateSettings(userId: string, tripId: string, input: BudgetSettingsInput): Promise<Trip> {
    await this.access.require(tripId, userId, "trip:edit");
    const trip = await this.trips.updateBudgetSettings(tripId, parseInput(budgetSettingsSchema, input));
    await this.events.publish({ tripId, topic: "budget", actorId: userId });
    return trip;
  }

  private async loadManageable(userId: string, expenseId: string): Promise<Expense> {
    const expense = await this.expenses.findById(expenseId);
    if (!expense) throw new NotFoundError("Gasto");
    await this.access.require(expense.tripId, userId, "expense:manage");
    return expense;
  }

  private async loadTrip(tripId: string): Promise<Trip> {
    const trip = await this.trips.findById(tripId);
    if (!trip) throw new NotFoundError("Viaje");
    return trip;
  }

  /** Validated details, with the amount in the trip's currency. */
  private async toDetails(input: ExpenseInput, tripId: string): Promise<ExpenseDetails> {
    const { currency, rate, amountCents, ...parsed } = parseInput(expenseSchema, input);
    const trip = await this.loadTrip(tripId);
    const details = { ...parsed, ...priceInTripCurrency({ amountCents, currency, rate }, trip.currency) };
    await this.assertActivityInTrip(details.activityId, tripId);
    await this.assertMembers(details, tripId);
    return details;
  }

  /** Who paid and who shares the cost must be in the trip. */
  private async assertMembers(
    { paidById, participantIds }: Pick<ExpenseDetails, "paidById" | "participantIds">,
    tripId: string,
  ): Promise<void> {
    const members = new Set((await this.members.listByTrip(tripId)).map((member) => member.userId));
    if (paidById !== null && !members.has(paidById)) {
      throw new ValidationError("Revisá quién pagó", { paidById: ["Elegí a alguien del viaje"] });
    }
    if (participantIds.some((id) => !members.has(id))) {
      throw new ValidationError("Revisá entre quiénes se divide", {
        participantIds: ["Elegí personas del viaje"],
      });
    }
  }

  /** Expenses can only be linked to activities of the same trip. */
  private async assertActivityInTrip(activityId: string | null, tripId: string): Promise<void> {
    if (activityId === null) return;
    const activity = await this.activities.findById(activityId);
    if (activity?.tripId !== tripId) {
      throw new ValidationError("La actividad no pertenece a este viaje", {
        activityId: ["Elegí una actividad de este viaje"],
      });
    }
  }
}
