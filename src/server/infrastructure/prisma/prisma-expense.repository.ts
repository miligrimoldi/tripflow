import type { Prisma } from "@/generated/prisma/client";
import type { Expense, ExpenseDetails, ForeignPrice, NewExpense } from "@/server/budget/expense";
import { isCurrency } from "@/server/shared/money";
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
    original: toForeignPrice(row),
    activity: row.activity,
    paidBy: row.paidBy,
    participants: row.participants.map((participant) => participant.user),
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  };
}

function toForeignPrice(row: ExpenseRow): ForeignPrice | null {
  const { originalCurrency, originalAmountCents, exchangeRate } = row;
  if (!originalCurrency || originalAmountCents === null || exchangeRate === null || !isCurrency(originalCurrency)) {
    return null;
  }
  // toFixed (not toString) never uses exponent notation; trailing zeros are dropped.
  const rate = exchangeRate
    .toFixed()
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
  return { currency: originalCurrency, amountCents: Number(originalAmountCents), rate };
}

function toRowData({ description, category, amountCents, original, activityId, paidById }: ExpenseDetails) {
  return {
    description,
    category,
    amountCents: BigInt(amountCents),
    originalCurrency: original?.currency ?? null,
    originalAmountCents: original ? BigInt(original.amountCents) : null,
    exchangeRate: original?.rate ?? null,
    activityId,
    paidById,
  };
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
