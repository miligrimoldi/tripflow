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
  /** Photo uploaded by the organizer, if any. */
  coverImageUrl: string | null;
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

export type TripTiming =
  | { kind: "upcoming"; daysUntil: number }
  | { kind: "ongoing"; dayNumber: number; totalDays: number }
  | { kind: "past" };

/** Where a trip stands relative to `today`: how many days are left, which day it is, or whether it's over. */
export function tripTiming(trip: Pick<Trip, "startDate" | "endDate">, today: DateOnly): TripTiming {
  if (today < trip.startDate) return { kind: "upcoming", daysUntil: daysInRange(today, trip.startDate) - 1 };
  if (today > trip.endDate) return { kind: "past" };
  return { kind: "ongoing", dayNumber: daysInRange(trip.startDate, today), totalDays: tripLength(trip) };
}
