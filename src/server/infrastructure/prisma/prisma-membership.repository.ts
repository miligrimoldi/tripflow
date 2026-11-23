import type { Prisma } from "@/generated/prisma/client";
import type { MemberRole, TripMember } from "@/server/members/member";
import type { MembershipRepository } from "@/server/members/member.repository";
import type { Db } from "./client";

const memberInclude = {
  user: { select: { name: true, email: true, image: true } },
} satisfies Prisma.TripMemberInclude;

type MemberRow = Prisma.TripMemberGetPayload<{ include: typeof memberInclude }>;

function toMember(row: MemberRow): TripMember {
  return {
    tripId: row.tripId,
    userId: row.userId,
    role: row.role,
    joinedAt: row.joinedAt,
    user: row.user,
  };
}

export class PrismaMembershipRepository implements MembershipRepository {
  constructor(private readonly db: Db) {}

  async find(tripId: string, userId: string): Promise<TripMember | null> {
    const row = await this.db.tripMember.findUnique({
      where: { tripId_userId: { tripId, userId } },
      include: memberInclude,
    });
    return row ? toMember(row) : null;
  }

  async listByTrip(tripId: string): Promise<TripMember[]> {
    const rows = await this.db.tripMember.findMany({
      where: { tripId },
      include: memberInclude,
      // Owner first, then in joining order.
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    });
    return rows.map(toMember);
  }

  async add(tripId: string, userId: string, role: MemberRole): Promise<void> {
    await this.db.tripMember.upsert({
      where: { tripId_userId: { tripId, userId } },
      create: { tripId, userId, role },
      update: {},
    });
  }

  async remove(tripId: string, userId: string): Promise<void> {
    await this.db.tripMember.delete({ where: { tripId_userId: { tripId, userId } } });
  }
}
