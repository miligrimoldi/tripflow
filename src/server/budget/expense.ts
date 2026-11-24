import { splitEvenly } from "../shared/money";

export const EXPENSE_CATEGORIES = ["ACCOMMODATION", "TRANSPORT", "FOOD", "ACTIVITIES", "SHOPPING", "OTHER"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface Person {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  tripId: string;
  description: string;
  category: ExpenseCategory;
  /** Estimated cost in cents of the trip's currency. */
  amountCents: number;
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
  activityId: string | null;
  paidById: string | null;
  participantIds: string[];
}

export type NewExpense = ExpenseDetails & { tripId: string; createdById: string };

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
