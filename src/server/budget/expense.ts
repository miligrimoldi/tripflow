import { ValidationError } from "../shared/errors";
import { convertCents, splitEvenly, type Currency } from "../shared/money";

export const EXPENSE_CATEGORIES = ["ACCOMMODATION", "TRANSPORT", "FOOD", "ACTIVITIES", "SHOPPING", "OTHER"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface Person {
  id: string;
  name: string;
}

/** How an expense paid in another currency was converted. */
export interface ForeignPrice {
  currency: Currency;
  /** What was actually paid, in cents of `currency`. */
  amountCents: number;
  /** 1 unit of `currency` = `rate` of the trip's currency (canonical decimal string). */
  rate: string;
}

export interface Expense {
  id: string;
  tripId: string;
  description: string;
  category: ExpenseCategory;
  /** Cost in cents of the trip's currency (converted, if paid in another one). */
  amountCents: number;
  /** Set when it was paid in another currency. */
  original: ForeignPrice | null;
  /** The activity this cost belongs to, if any (e.g. a museum ticket). */
  activity: { id: string; title: string } | null;
  /** Who paid it. `null` while it's only an estimate: it doesn't create debts yet. */
  paidBy: Person | null;
  /** Who it's split among, in equal parts. */
  participants: Person[];
  createdBy: Person;
  createdAt: Date;
}

export interface ExpenseDetails {
  description: string;
  category: ExpenseCategory;
  amountCents: number;
  original: ForeignPrice | null;
  activityId: string | null;
  paidById: string | null;
  participantIds: string[];
}

export type NewExpense = ExpenseDetails & { tripId: string; createdById: string };

/**
 * The expense's amount in the trip's currency. Paid in the same currency, it
 * is what was typed; in another one, it is converted with the given rate,
 * which is kept with the expense so the conversion never changes later.
 */
export function priceInTripCurrency(
  { amountCents, currency, rate }: { amountCents: number; currency: Currency | null; rate: string | null },
  tripCurrency: Currency,
): Pick<ExpenseDetails, "amountCents" | "original"> {
  if (currency === null || currency === tripCurrency) return { amountCents, original: null };
  if (rate === null) {
    throw new ValidationError("Falta la cotización", {
      rate: [`Indicá a cuánto estaba 1 ${currency} en ${tripCurrency}`],
    });
  }
  const converted = convertCents(amountCents, rate);
  if (converted === null) {
    throw new ValidationError("Revisá la cotización", { rate: ["Con esa cotización el monto no es válido"] });
  }
  return { amountCents: converted, original: { currency, amountCents, rate } };
}

/** Share of the budget used from which we warn that it's running out. */
export const BUDGET_WARNING_RATIO = 0.9;

export type BudgetStatus = "no-budget" | "ok" | "warning" | "over";

export interface CategoryTotal {
  category: ExpenseCategory;
  totalCents: number;
  /** Fraction of the trip total (0–1). */
  share: number;
}

export interface BudgetSummary {
  totalCents: number;
  budgetCents: number | null;
  /** Negative when over budget; null without a budget. */
  remainingCents: number | null;
  /** total / budget (can exceed 1); null without a budget. */
  usedRatio: number | null;
  status: BudgetStatus;
  /** Categories with costs, largest first. */
  byCategory: CategoryTotal[];
  /** What each member would pay if costs were split evenly (the largest share, so nobody is told less). */
  perPersonCents: number | null;
}

export function summarizeBudget(
  expenses: Pick<Expense, "category" | "amountCents">[],
  budgetCents: number | null,
  memberCount: number,
): BudgetSummary {
  const totalCents = expenses.reduce((sum, expense) => sum + expense.amountCents, 0);

  const totals = new Map<ExpenseCategory, number>();
  for (const { category, amountCents } of expenses) {
    totals.set(category, (totals.get(category) ?? 0) + amountCents);
  }
  const byCategory = [...totals.entries()]
    .map(([category, categoryTotal]) => ({ category, totalCents: categoryTotal, share: categoryTotal / totalCents }))
    .sort((a, b) => b.totalCents - a.totalCents);

  const usedRatio = budgetCents ? totalCents / budgetCents : null;
  const status: BudgetStatus =
    usedRatio === null ? "no-budget" : usedRatio > 1 ? "over" : usedRatio >= BUDGET_WARNING_RATIO ? "warning" : "ok";

  return {
    totalCents,
    budgetCents,
    remainingCents: budgetCents === null ? null : budgetCents - totalCents,
    usedRatio,
    status,
    byCategory,
    perPersonCents: memberCount > 0 && totalCents > 0 ? splitEvenly(totalCents, memberCount)[0] : null,
  };
}

/** Estimated cost of each activity that has linked expenses. */
export function costsByActivity(expenses: Pick<Expense, "activity" | "amountCents">[]): Map<string, number> {
  const costs = new Map<string, number>();
  for (const { activity, amountCents } of expenses) {
    if (activity) costs.set(activity.id, (costs.get(activity.id) ?? 0) + amountCents);
  }
  return costs;
}
