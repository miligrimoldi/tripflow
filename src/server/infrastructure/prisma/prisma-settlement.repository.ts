import type { Prisma } from "@/generated/prisma/client";
import type { NewSettlement, Settlement } from "@/server/budget/settlement";
import type { SettlementRepository } from "@/server/budget/settlement.repository";
import type { Db } from "./client";

const person = { select: { id: true, name: true } } as const;
const settlementInclude = { from: person, to: person, createdBy: person } satisfies Prisma.SettlementInclude;

type SettlementRow = Prisma.SettlementGetPayload<{ include: typeof settlementInclude }>;

function toSettlement({ id, tripId, from, to, amountCents, createdBy, createdAt }: SettlementRow): Settlement {
  return { id, tripId, from, to, amountCents: Number(amountCents), createdBy, createdAt };
}

export class PrismaSettlementRepository implements SettlementRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<Settlement | null> {
    const row = await this.db.settlement.findUnique({ where: { id }, include: settlementInclude });
    return row ? toSettlement(row) : null;
  }

  async listByTrip(tripId: string): Promise<Settlement[]> {
    const rows = await this.db.settlement.findMany({
      where: { tripId },
      include: settlementInclude,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toSettlement);
  }

  async create({ amountCents, ...data }: NewSettlement): Promise<Settlement> {
    const row = await this.db.settlement.create({
      data: { ...data, amountCents: BigInt(amountCents) },
      include: settlementInclude,
    });
    return toSettlement(row);
  }

  async delete(id: string): Promise<void> {
    await this.db.settlement.deleteMany({ where: { id } });
  }
}
