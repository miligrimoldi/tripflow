import { describe, expect, it } from "vitest";
import { costsByActivity, summarizeBudget, type ExpenseCategory } from "./expense";

const expense = (category: ExpenseCategory, amountCents: number, activityId?: string) => ({
  category,
  amountCents,
  activity: activityId ? { id: activityId, title: activityId } : null,
});

describe("summarizeBudget", () => {
  const expenses = [
    expense("ACCOMMODATION", 60_000),
    expense("FOOD", 25_000),
    expense("TRANSPORT", 10_000),
    expense("FOOD", 5_000),
  ];

  it("adds up the total and groups by category, largest first", () => {
    const summary = summarizeBudget(expenses, null, 3);
    expect(summary.totalCents).toBe(100_000);
    expect(summary.byCategory).toEqual([
      { category: "ACCOMMODATION", totalCents: 60_000, share: 0.6 },
      { category: "FOOD", totalCents: 30_000, share: 0.3 },
      { category: "TRANSPORT", totalCents: 10_000, share: 0.1 },
    ]);
  });

  it("reports no budget status when there is no budget", () => {
    expect(summarizeBudget(expenses, null, 3)).toMatchObject({
      status: "no-budget",
      remainingCents: null,
      usedRatio: null,
    });
  });

  it.each([
    [200_000, "ok", 100_000],
    [110_000, "warning", 10_000],
    [100_000, "warning", 0],
    [80_000, "over", -20_000],
  ] as const)("with a budget of %i cents the status is %s", (budget, status, remaining) => {
    expect(summarizeBudget(expenses, budget, 3)).toMatchObject({ status, remainingCents: remaining });
  });

  it("splits the total per person without losing cents (largest share)", () => {
    expect(summarizeBudget(expenses, null, 3).perPersonCents).toBe(33_334);
    expect(summarizeBudget([], null, 3).perPersonCents).toBeNull();
  });
});

describe("costsByActivity", () => {
  it("adds up the costs linked to each activity", () => {
    const costs = costsByActivity([
      expense("ACTIVITIES", 1_000, "ski"),
      expense("TRANSPORT", 500, "ski"),
      expense("FOOD", 700, "dinner"),
      expense("OTHER", 9_999),
    ]);
    expect(Object.fromEntries(costs)).toEqual({ ski: 1_500, dinner: 700 });
  });
});
