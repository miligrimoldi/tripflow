import { beforeEach, describe, expect, it } from "vitest";
import { ForbiddenError, NotFoundError, ValidationError } from "../shared/errors";
import { createTestApp } from "../testing/in-memory";

describe("BudgetService", () => {
  let app: ReturnType<typeof createTestApp>;
  let ana: { id: string };
  let bruno: { id: string };
  let outsider: { id: string };
  let tripId: string;

  beforeEach(async () => {
    app = createTestApp();
    ana = app.addUser("Ana");
    bruno = app.addUser("Bruno");
    outsider = app.addUser("Carla");
    ({ id: tripId } = await app.tripService.create(ana.id, {
      name: "Patagonia",
      destination: "Bariloche",
      startDate: "2026-07-10",
      endDate: "2026-07-12",
    }));
    await app.repositories.members.add(tripId, bruno.id, "EDITOR");
  });

  const add = (userId: string, input: Record<string, unknown>) =>
    app.budgetService.addExpense(userId, tripId, { description: "Gasto", category: "OTHER", amount: "1000", ...input });

  describe("expenses", () => {
    it("parses amounts typed in Argentine format into cents", async () => {
      const expense = await add(ana.id, { description: "Cabaña", category: "ACCOMMODATION", amount: "250.000,50" });
      expect(expense).toMatchObject({ description: "Cabaña", amountCents: 25_000_050, createdBy: { name: "Ana" } });
    });

    it("lets any member add costs, but not outsiders", async () => {
      await expect(add(bruno.id, {})).resolves.toMatchObject({ createdBy: { name: "Bruno" } });
      await expect(add(outsider.id, {})).rejects.toBeInstanceOf(NotFoundError);
    });

    it.each([["0"], ["-5"], ["abc"], [""]])("rejects invalid amount %j", async (amount) => {
      await expect(add(ana.id, { amount })).rejects.toMatchObject({ fieldErrors: { amount: expect.any(Array) } });
    });

    it("links a cost to an activity of the same trip", async () => {
      const ski = await app.activityService.create(ana.id, tripId, { title: "Esquí" });
      const expense = await add(ana.id, { activityId: ski.id, amount: "80.000" });
      expect(expense.activity).toEqual({ id: ski.id, title: "Esquí" });

      const costs = await app.budgetService.getActivityCosts(ana.id, tripId);
      expect(costs.get(ski.id)).toBe(8_000_000);
    });

    it("rejects linking an activity from another trip", async () => {
      const { id: otherTripId } = await app.tripService.create(ana.id, {
        name: "Otro",
        destination: "Salta",
        startDate: "2026-09-01",
        endDate: "2026-09-02",
      });
      const foreign = await app.activityService.create(ana.id, otherTripId, { title: "Cafayate" });

      await expect(add(ana.id, { activityId: foreign.id })).rejects.toBeInstanceOf(ValidationError);
    });

    it("keeps the cost when its activity is deleted", async () => {
      const ski = await app.activityService.create(ana.id, tripId, { title: "Esquí" });
      const expense = await add(ana.id, { activityId: ski.id });

      await app.activityService.delete(ana.id, ski.id);

      expect(await app.budgetService.getExpense(ana.id, expense.id)).toMatchObject({ activity: null });
    });

    it("updates and deletes costs", async () => {
      const expense = await add(ana.id, { amount: "1000" });
      await app.budgetService.updateExpense(bruno.id, expense.id, {
        description: "Nafta",
        category: "TRANSPORT",
        amount: "1500",
      });
      expect(await app.budgetService.getExpense(ana.id, expense.id)).toMatchObject({
        description: "Nafta",
        amountCents: 150_000,
      });

      await app.budgetService.deleteExpense(ana.id, expense.id);
      await expect(app.budgetService.getExpense(ana.id, expense.id)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("overview and settings", () => {
    it("summarizes against the budget and splits per member", async () => {
      await app.budgetService.updateSettings(ana.id, tripId, { currency: "USD", budget: "1.000" });
      await add(ana.id, { category: "ACCOMMODATION", amount: "600" });
      await add(bruno.id, { category: "FOOD", amount: "350" });

      const { trip, summary } = await app.budgetService.getOverview(bruno.id, tripId);
      expect(trip).toMatchObject({ currency: "USD", budgetCents: 100_000 });
      expect(summary).toMatchObject({
        totalCents: 95_000,
        remainingCents: 5_000,
        status: "warning",
        perPersonCents: 47_500,
      });
    });

    it("lets only the organizer change currency and budget", async () => {
      await expect(
        app.budgetService.updateSettings(bruno.id, tripId, { currency: "USD", budget: "100" }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("allows removing the budget and rejects unknown currencies", async () => {
      await app.budgetService.updateSettings(ana.id, tripId, { currency: "EUR", budget: "500" });
      const trip = await app.budgetService.updateSettings(ana.id, tripId, { currency: "EUR", budget: "" });
      expect(trip.budgetCents).toBeNull();

      await expect(
        app.budgetService.updateSettings(ana.id, tripId, { currency: "BTC", budget: "" }),
      ).rejects.toBeInstanceOf(ValidationError);
    });
  });
});
