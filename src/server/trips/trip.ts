import { daysInRange, eachDayInRange, type DateOnly } from "../shared/date-only";
import type { MemberRole } from "../members/member";
import type { Currency } from "../shared/money";

export const MAX_TRIP_DAYS = 60;

export interface Trip {
  id: string;
  name: string;
  destination: string;
  description: string | null;
  startDate: DateOnly;
  endDate: DateOnly;
  /** Currency of every amount in the trip's budget. */
  currency: Currency;
  /** Optional total budget, in cents of `currency`. */
  budgetCents: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export type TripDetails = Pick<Trip, "name" | "destination" | "description" | "startDate" | "endDate">;

export type BudgetSettings = Pick<Trip, "currency" | "budgetCents">;

/** A trip as seen from one of its members (used in listings). */
export interface TripSummary extends Trip {
  role: MemberRole;
  memberCount: number;
}

export function tripDays(trip: Pick<Trip, "startDate" | "endDate">): DateOnly[] {
  return eachDayInRange(trip.startDate, trip.endDate);
}

export function tripLength(trip: Pick<Trip, "startDate" | "endDate">): number {
  return daysInRange(trip.startDate, trip.endDate);
}
