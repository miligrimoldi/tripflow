import type { Prisma } from "@/generated/prisma/client";
import type { Expense, ExpenseDetails, NewExpense } from "@/server/budget/expense";
import type { ExpenseRepository } from "@/server/budget/expense.repository";
import type { Db } from "./client";

const person = { select: { id: true, name: true } } as const;

const expenseInclude = {
  activity: { select: { id: true, title: true } },
  createdBy: person,
  paidBy: person,
  participants: { select: { user: person }, orderBy: { user: { name: "asc" } } },
} satisfies Prisma.ExpenseInclude;

type ExpenseRow = Prisma.ExpenseGetPayload<{ include: typeof expenseInclude }>;

function toExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    tripId: row.tripId,
    description: row.description,
    category: row.category,
    // BIGINT column; amounts are capped far below Number.MAX_SAFE_INTEGER.
    amountCents: Number(row.amountCents),
    activity: row.activity,
    paidBy: row.paidBy,
    participants: row.participants.map((participant) => participant.user),
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  };
}

function toRowData({ description, category, amountCents, activityId, paidById }: ExpenseDetails) {
  return { description, category, amountCents: BigInt(amountCents), activityId, paidById };
}

const participantRows = (participantIds: string[]) => participantIds.map((userId) => ({ userId }));

export class PrismaExpenseRepository implements ExpenseRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<Expense | null> {
    const row = await this.db.expense.findUnique({ where: { id }, include: expenseInclude });
    return row ? toExpense(row) : null;
  }

  async listByTrip(tripId: string): Promise<Expense[]> {
    const rows = await this.db.expense.findMany({
      where: { tripId },
      include: expenseInclude,
      orderBy: [{ amountCents: "desc" }, { createdAt: "desc" }],
    });
    return rows.map(toExpense);
  }

  async create({ tripId, createdById, ...details }: NewExpense): Promise<Expense> {
    const row = await this.db.expense.create({
      data: {
        ...toRowData(details),
        tripId,
        createdById,
        participants: { create: participantRows(details.participantIds) },
      },
      include: expenseInclude,
    });
    return toExpense(row);
  }

  async update(id: string, details: ExpenseDetails): Promise<Expense> {
    // Nested writes run in one transaction: the participants are replaced atomically.
    const row = await this.db.expense.update({
      where: { id },
      data: {
        ...toRowData(details),
        participants: { deleteMany: {}, create: participantRows(details.participantIds) },
      },
      include: expenseInclude,
    });
    return toExpense(row);
  }

  async delete(id: string): Promise<void> {
    await this.db.expense.delete({ where: { id } });
  }
}
