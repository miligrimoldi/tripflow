/**
 * In-memory implementations of the repository ports, used by unit tests.
 *
 * Because services depend on interfaces (not on Prisma), the whole business
 * logic can be tested fast and without a database.
 */
import type { Activity, ActivityDetails, NewActivity, SlotOrder } from "../activities/activity";
import type { ActivityRepository } from "../activities/activity.repository";
import { ActivityService } from "../activities/activity.service";
import { BudgetService } from "../budget/budget.service";
import type { Expense, ExpenseDetails, NewExpense } from "../budget/expense";
import type { Comment, NewComment, Vote } from "../discussions/discussion";
import type { DiscussionRepository } from "../discussions/discussion.repository";
import { DiscussionService } from "../discussions/discussion.service";
import type { ExpenseRepository } from "../budget/expense.repository";
import type { Invitation, NewInvitation } from "../members/invitation";
import type { InvitationRepository } from "../members/invitation.repository";
import type { MemberRole, TripMember } from "../members/member";
import type { MembershipRepository } from "../members/member.repository";
import { MembershipService } from "../members/membership.service";
import { TripAccessPolicy } from "../members/trip-access";
import { isWithinRange, type DateOnly } from "../shared/date-only";
import type { Clock, TokenGenerator } from "../shared/ports";
import type { BudgetSettings, Trip, TripDetails, TripSummary } from "../trips/trip";
import type { TripRepository } from "../trips/trip.repository";
import { RouteService } from "../routes/route.service";
import { StraightLineTravelCost } from "../routes/travel-cost";
import { TripService } from "../trips/trip.service";

export interface FakeUser {
  id: string;
  name: string;
  email: string;
}

/** Shared state so repositories can "join" across tables like a real DB. */
class FakeDb {
  users = new Map<string, FakeUser>();
  trips = new Map<string, Trip>();
  members: Omit<TripMember, "user">[] = [];
  activities = new Map<string, Activity>();
  invitations: Invitation[] = [];
  expenses = new Map<string, Expense>();
  votes: { activityId: string; userId: string }[] = [];
  comments = new Map<string, Comment>();
  private sequence = 0;

  nextId(prefix: string) {
    this.sequence += 1;
    return `${prefix}-${this.sequence}`;
  }

  addUser(name: string): FakeUser {
    const user = { id: this.nextId("user"), name, email: `${name.toLowerCase()}@example.com` };
    this.users.set(user.id, user);
    return user;
  }

  withProfile(member: Omit<TripMember, "user">): TripMember {
    const user = this.users.get(member.userId);
    return { ...member, user: { name: user?.name ?? "?", email: user?.email ?? "?", image: null } };
  }
}

class InMemoryTripRepository implements TripRepository {
  constructor(private readonly db: FakeDb) {}

  async createWithOwner(details: TripDetails, ownerId: string): Promise<Trip> {
    const now = new Date();
    const trip: Trip = {
      ...details,
      id: this.db.nextId("trip"),
      currency: "ARS",
      budgetCents: null,
      createdAt: now,
      updatedAt: now,
    };
    this.db.trips.set(trip.id, trip);
    this.db.members.push({ tripId: trip.id, userId: ownerId, role: "OWNER", joinedAt: now });
    return trip;
  }

  async findById(id: string) {
    return this.db.trips.get(id) ?? null;
  }

  async listForUser(userId: string): Promise<TripSummary[]> {
    return this.db.members
      .filter((m) => m.userId === userId)
      .map((m) => ({
        ...this.db.trips.get(m.tripId)!,
        role: m.role,
        memberCount: this.db.members.filter((other) => other.tripId === m.tripId).length,
      }));
  }

  async update(id: string, details: TripDetails): Promise<Trip> {
    const trip = { ...this.db.trips.get(id)!, ...details, updatedAt: new Date() };
    this.db.trips.set(id, trip);
    return trip;
  }

  async updateBudgetSettings(id: string, settings: BudgetSettings): Promise<Trip> {
    const trip = { ...this.db.trips.get(id)!, ...settings, updatedAt: new Date() };
    this.db.trips.set(id, trip);
    return trip;
  }

  async delete(id: string) {
    this.db.trips.delete(id);
    this.db.members = this.db.members.filter((m) => m.tripId !== id);
    for (const [activityId, activity] of this.db.activities) {
      if (activity.tripId === id) this.db.activities.delete(activityId);
    }
  }
}

class InMemoryMembershipRepository implements MembershipRepository {
  constructor(private readonly db: FakeDb) {}

  async find(tripId: string, userId: string) {
    const member = this.db.members.find((m) => m.tripId === tripId && m.userId === userId);
    return member ? this.db.withProfile(member) : null;
  }

  async listByTrip(tripId: string) {
    return this.db.members.filter((m) => m.tripId === tripId).map((m) => this.db.withProfile(m));
  }

  async add(tripId: string, userId: string, role: MemberRole) {
    if (!(await this.find(tripId, userId))) {
      this.db.members.push({ tripId, userId, role, joinedAt: new Date() });
    }
  }

  async remove(tripId: string, userId: string) {
    this.db.members = this.db.members.filter((m) => !(m.tripId === tripId && m.userId === userId));
  }
}

class InMemoryInvitationRepository implements InvitationRepository {
  constructor(private readonly db: FakeDb) {}

  async replaceForTrip(data: NewInvitation) {
    const invitation: Invitation = { ...data, id: this.db.nextId("inv"), createdAt: new Date() };
    this.db.invitations = [...this.db.invitations.filter((i) => i.tripId !== data.tripId), invitation];
    return invitation;
  }

  async findLatestByTrip(tripId: string) {
    return this.db.invitations.findLast((i) => i.tripId === tripId) ?? null;
  }

  async findByToken(token: string) {
    return this.db.invitations.find((i) => i.token === token) ?? null;
  }
}

class InMemoryActivityRepository implements ActivityRepository {
  constructor(private readonly db: FakeDb) {}

  async findById(id: string) {
    return this.db.activities.get(id) ?? null;
  }

  async listByTrip(tripId: string) {
    return [...this.db.activities.values()].filter((a) => a.tripId === tripId);
  }

  async listBySlot(tripId: string, date: DateOnly | null) {
    return (await this.listByTrip(tripId)).filter((a) => a.date === date).sort((a, b) => a.position - b.position);
  }

  async nextPosition(tripId: string, date: DateOnly | null) {
    const positions = (await this.listBySlot(tripId, date)).map((a) => a.position);
    return positions.length === 0 ? 0 : Math.max(...positions) + 1;
  }

  async create(data: NewActivity) {
    const now = new Date();
    const { createdById, ...rest } = data;
    const activity: Activity = {
      ...rest,
      id: this.db.nextId("act"),
      createdBy: { id: createdById, name: this.db.users.get(createdById)?.name ?? "?" },
      createdAt: now,
      updatedAt: now,
    };
    this.db.activities.set(activity.id, activity);
    return activity;
  }

  async update(id: string, data: ActivityDetails & { position: number }) {
    const activity = { ...this.db.activities.get(id)!, ...data, updatedAt: new Date() };
    this.db.activities.set(id, activity);
    return activity;
  }

  async saveOrder(slots: SlotOrder[]) {
    for (const { date, activityIds } of slots) {
      activityIds.forEach((id, position) => {
        this.db.activities.set(id, { ...this.db.activities.get(id)!, date, position });
      });
    }
  }

  async delete(id: string) {
    this.db.activities.delete(id);
    // Like the database (ON DELETE SET NULL): linked costs are kept, unlinked.
    for (const [expenseId, expense] of this.db.expenses) {
      if (expense.activity?.id === id) this.db.expenses.set(expenseId, { ...expense, activity: null });
    }
  }

  async unscheduleOutsideRange(tripId: string, start: DateOnly, end: DateOnly) {
    const outside = (await this.listByTrip(tripId)).filter((a) => a.date && !isWithinRange(a.date, start, end));
    let position = await this.nextPosition(tripId, null);
    for (const activity of outside) {
      this.db.activities.set(activity.id, { ...activity, date: null, position: position++ });
    }
    return outside.length;
  }
}

class InMemoryExpenseRepository implements ExpenseRepository {
  constructor(private readonly db: FakeDb) {}

  async findById(id: string) {
    return this.db.expenses.get(id) ?? null;
  }

  async listByTrip(tripId: string) {
    return [...this.db.expenses.values()]
      .filter((expense) => expense.tripId === tripId)
      .sort((a, b) => b.amountCents - a.amountCents);
  }

  async create({ tripId, createdById, ...details }: NewExpense) {
    const expense: Expense = {
      ...this.toFields(details),
      id: this.db.nextId("exp"),
      tripId,
      createdBy: { id: createdById, name: this.db.users.get(createdById)?.name ?? "?" },
      createdAt: new Date(),
    };
    this.db.expenses.set(expense.id, expense);
    return expense;
  }

  async update(id: string, details: ExpenseDetails) {
    const expense = { ...this.db.expenses.get(id)!, ...this.toFields(details) };
    this.db.expenses.set(id, expense);
    return expense;
  }

  async delete(id: string) {
    this.db.expenses.delete(id);
  }

  private toFields({ activityId, ...details }: ExpenseDetails) {
    const activity = activityId ? this.db.activities.get(activityId) : undefined;
    return { ...details, activity: activity ? { id: activity.id, title: activity.title } : null };
  }
}

export class FakeClock implements Clock {
  constructor(private current = new Date("2026-01-01T12:00:00Z")) {}

  now() {
    return this.current;
  }

  advanceDays(days: number) {
    this.current = new Date(this.current.getTime() + days * 24 * 60 * 60 * 1000);
  }
}

export class SequentialTokens implements TokenGenerator {
  private count = 0;

  generate() {
    this.count += 1;
    return `token-${this.count}`;
  }
}

/** Builds every service wired to in-memory infrastructure. */
class InMemoryDiscussionRepository implements DiscussionRepository {
  constructor(private readonly db: FakeDb) {}

  private inTrip(tripId: string) {
    return (activityId: string) => this.db.activities.get(activityId)?.tripId === tripId;
  }

  private person(id: string) {
    return { id, name: this.db.users.get(id)?.name ?? "?" };
  }

  async listVotes(tripId: string): Promise<Vote[]> {
    return this.db.votes
      .filter((vote) => this.inTrip(tripId)(vote.activityId))
      .map((vote) => ({ activityId: vote.activityId, user: this.person(vote.userId) }));
  }

  async addVote(activityId: string, userId: string) {
    if (!this.db.votes.some((v) => v.activityId === activityId && v.userId === userId)) {
      this.db.votes.push({ activityId, userId });
    }
  }

  async removeVote(activityId: string, userId: string) {
    this.db.votes = this.db.votes.filter((v) => !(v.activityId === activityId && v.userId === userId));
  }

  async listComments(tripId: string) {
    return [...this.db.comments.values()].filter((comment) => this.inTrip(tripId)(comment.activityId));
  }

  async findComment(id: string) {
    return this.db.comments.get(id) ?? null;
  }

  async addComment({ activityId, authorId, body }: NewComment) {
    const comment: Comment = {
      id: this.db.nextId("comment"),
      activityId,
      author: this.person(authorId),
      body,
      // Strictly increasing, so ordering by date is deterministic in tests.
      createdAt: new Date(Date.UTC(2026, 0, 1) + this.db.comments.size * 1000),
    };
    this.db.comments.set(comment.id, comment);
    return comment;
  }

  async deleteComment(id: string) {
    this.db.comments.delete(id);
  }
}

export function createTestApp() {
  const db = new FakeDb();
  const trips = new InMemoryTripRepository(db);
  const members = new InMemoryMembershipRepository(db);
  const invitations = new InMemoryInvitationRepository(db);
  const activities = new InMemoryActivityRepository(db);
  const expenses = new InMemoryExpenseRepository(db);
  const discussions = new InMemoryDiscussionRepository(db);
  const access = new TripAccessPolicy(members);
  const clock = new FakeClock();

  return {
    db,
    clock,
    repositories: { trips, members, invitations, activities, expenses, discussions },
    tripService: new TripService(trips, activities, access),
    activityService: new ActivityService(activities, trips, access),
    budgetService: new BudgetService(expenses, trips, activities, members, access),
    routeService: new RouteService(activities, trips, new StraightLineTravelCost(), access),
    discussionService: new DiscussionService(discussions, activities, access),
    membershipService: new MembershipService(members, invitations, trips, access, new SequentialTokens(), clock),
    addUser: (name: string) => db.addUser(name),
  };
}
