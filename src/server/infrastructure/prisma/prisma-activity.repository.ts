import type { Prisma } from "@/generated/prisma/client";
import type { Activity, ActivityDetails, NewActivity } from "@/server/activities/activity";
import type { ActivityRepository } from "@/server/activities/activity.repository";
import { dateOnlyFromDate, dateOnlyToDate, type DateOnly } from "@/server/shared/date-only";
import type { Db } from "./client";

const activityInclude = {
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.ActivityInclude;

type ActivityRow = Prisma.ActivityGetPayload<{ include: typeof activityInclude }>;

function toActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    tripId: row.tripId,
    title: row.title,
    category: row.category,
    notes: row.notes,
    location: row.location,
    url: row.url,
    date: row.date ? dateOnlyFromDate(row.date) : null,
    startTime: row.startTime,
    position: row.position,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toRowData(details: ActivityDetails) {
  return {
    title: details.title,
    category: details.category,
    notes: details.notes,
    location: details.location,
    url: details.url,
    date: details.date ? dateOnlyToDate(details.date) : null,
    startTime: details.startTime,
  };
}

const slotWhere = (tripId: string, date: DateOnly | null): Prisma.ActivityWhereInput => ({
  tripId,
  date: date ? dateOnlyToDate(date) : null,
});

type Tx = Prisma.TransactionClient | Db;

export class PrismaActivityRepository implements ActivityRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<Activity | null> {
    const row = await this.db.activity.findUnique({ where: { id }, include: activityInclude });
    return row ? toActivity(row) : null;
  }

  async listByTrip(tripId: string): Promise<Activity[]> {
    const rows = await this.db.activity.findMany({
      where: { tripId },
      include: activityInclude,
      orderBy: [{ date: "asc" }, { position: "asc" }],
    });
    return rows.map(toActivity);
  }

  async listBySlot(tripId: string, date: DateOnly | null): Promise<Activity[]> {
    const rows = await this.db.activity.findMany({
      where: slotWhere(tripId, date),
      include: activityInclude,
      orderBy: { position: "asc" },
    });
    return rows.map(toActivity);
  }

  nextPosition(tripId: string, date: DateOnly | null): Promise<number> {
    return this.nextPositionIn(this.db, tripId, date);
  }

  async create(data: NewActivity): Promise<Activity> {
    const row = await this.db.activity.create({
      data: {
        ...toRowData(data),
        position: data.position,
        trip: { connect: { id: data.tripId } },
        createdBy: { connect: { id: data.createdById } },
      },
      include: activityInclude,
    });
    return toActivity(row);
  }

  async update(id: string, data: ActivityDetails & { position: number }): Promise<Activity> {
    const row = await this.db.activity.update({
      where: { id },
      data: { ...toRowData(data), position: data.position },
      include: activityInclude,
    });
    return toActivity(row);
  }

  async setOrder(orderedIds: string[]): Promise<void> {
    await this.db.$transaction(
      orderedIds.map((id, position) => this.db.activity.update({ where: { id }, data: { position } })),
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.activity.delete({ where: { id } });
  }

  unscheduleOutsideRange(tripId: string, start: DateOnly, end: DateOnly): Promise<number> {
    return this.db.$transaction(async (tx) => {
      const outside = await tx.activity.findMany({
        where: {
          tripId,
          OR: [{ date: { lt: dateOnlyToDate(start) } }, { date: { gt: dateOnlyToDate(end) } }],
        },
        orderBy: [{ date: "asc" }, { position: "asc" }],
        select: { id: true },
      });
      if (outside.length === 0) return 0;

      const first = await this.nextPositionIn(tx, tripId, null);
      for (const [index, { id }] of outside.entries()) {
        await tx.activity.update({ where: { id }, data: { date: null, position: first + index } });
      }
      return outside.length;
    });
  }

  private async nextPositionIn(db: Tx, tripId: string, date: DateOnly | null): Promise<number> {
    const { _max } = await db.activity.aggregate({
      where: slotWhere(tripId, date),
      _max: { position: true },
    });
    return (_max.position ?? -1) + 1;
  }
}
