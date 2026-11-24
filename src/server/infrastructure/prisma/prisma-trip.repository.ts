import type { Trip as TripRow } from "@/generated/prisma/client";
import { dateOnlyFromDate, dateOnlyToDate } from "@/server/shared/date-only";
import { isCurrency } from "@/server/shared/money";
import type { BudgetSettings, Trip, TripDetails, TripSummary } from "@/server/trips/trip";
import type { TripRepository } from "@/server/trips/trip.repository";
import type { Db } from "./client";

export function toTrip(row: TripRow): Trip {
  return {
    id: row.id,
    name: row.name,
    destination: row.destination,
    description: row.description,
    startDate: dateOnlyFromDate(row.startDate),
    endDate: dateOnlyFromDate(row.endDate),
    // The column is free text; anything unexpected falls back to the default.
    currency: isCurrency(row.currency) ? row.currency : "ARS",
    budgetCents: row.budgetCents === null ? null : Number(row.budgetCents),
    coverImageUrl: row.coverImageUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toRowData(details: TripDetails) {
  return {
    name: details.name,
    destination: details.destination,
    description: details.description,
    startDate: dateOnlyToDate(details.startDate),
    endDate: dateOnlyToDate(details.endDate),
  };
}

export class PrismaTripRepository implements TripRepository {
  constructor(private readonly db: Db) {}

  async createWithOwner(details: TripDetails, ownerId: string): Promise<Trip> {
    const row = await this.db.trip.create({
      data: {
        ...toRowData(details),
        members: { create: { userId: ownerId, role: "OWNER" } },
      },
    });
    return toTrip(row);
  }

  async findById(id: string): Promise<Trip | null> {
    const row = await this.db.trip.findUnique({ where: { id } });
    return row ? toTrip(row) : null;
  }

  async listForUser(userId: string): Promise<TripSummary[]> {
    const memberships = await this.db.tripMember.findMany({
      where: { userId },
      include: { trip: { include: { _count: { select: { members: true } } } } },
      orderBy: { trip: { startDate: "asc" } },
    });

    return memberships.map(({ role, trip }) => ({
      ...toTrip(trip),
      role,
      memberCount: trip._count.members,
    }));
  }

  async update(id: string, details: TripDetails): Promise<Trip> {
    const row = await this.db.trip.update({ where: { id }, data: toRowData(details) });
    return toTrip(row);
  }

  async updateBudgetSettings(id: string, { currency, budgetCents }: BudgetSettings): Promise<Trip> {
    const row = await this.db.trip.update({
      where: { id },
      data: { currency, budgetCents: budgetCents === null ? null : BigInt(budgetCents) },
    });
    return toTrip(row);
  }

  async updateCover(id: string, coverImageUrl: string | null): Promise<Trip> {
    return toTrip(await this.db.trip.update({ where: { id }, data: { coverImageUrl } }));
  }

  async delete(id: string): Promise<void> {
    await this.db.trip.delete({ where: { id } });
  }
}
