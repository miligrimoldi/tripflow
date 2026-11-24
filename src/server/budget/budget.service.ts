import type { ActivityRepository } from "../activities/activity.repository";
import type { MembershipRepository } from "../members/member.repository";
import type { TripAccessPolicy } from "../members/trip-access";
import { NotFoundError, ValidationError } from "../shared/errors";
import { parseInput } from "../shared/validation";
import type { Trip } from "../trips/trip";
import type { TripRepository } from "../trips/trip.repository";
import { costsByActivity, summarizeBudget, type BudgetSummary, type Expense } from "./expense";
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
    const details = parseInput(expenseSchema, input);
    await this.assertActivityInTrip(details.activityId, tripId);
    return this.expenses.create({ ...details, tripId, createdById: userId });
  }

  async updateExpense(userId: string, expenseId: string, input: ExpenseInput): Promise<Expense> {
    const current = await this.loadManageable(userId, expenseId);
    const details = parseInput(expenseSchema, input);
    await this.assertActivityInTrip(details.activityId, current.tripId);
    return this.expenses.update(expenseId, details);
  }

  async deleteExpense(userId: string, expenseId: string): Promise<{ tripId: string }> {
    const current = await this.loadManageable(userId, expenseId);
    await this.expenses.delete(expenseId);
    return { tripId: current.tripId };
  }

  /** Currency and total budget are trip settings: only the organizer changes them. */
  async updateSettings(userId: string, tripId: string, input: BudgetSettingsInput): Promise<Trip> {
    await this.access.require(tripId, userId, "trip:edit");
    return this.trips.updateBudgetSettings(tripId, parseInput(budgetSettingsSchema, input));
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
