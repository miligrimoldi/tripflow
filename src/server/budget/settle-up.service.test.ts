import { beforeEach, describe, expect, it } from "vitest";
import { NotFoundError, ValidationError } from "../shared/errors";
import { createTestApp } from "../testing/in-memory";

describe("SettleUpService", () => {
  let app: ReturnType<typeof createTestApp>;
  let ana: { id: string };
  let bruno: { id: string };
  let carla: { id: string };
  let tripId: string;

  beforeEach(async () => {
    app = createTestApp();
    ana = app.addUser("Ana");
    bruno = app.addUser("Bruno");
    carla = app.addUser("Carla");
    ({ id: tripId } = await app.tripService.create(ana.id, {
      name: "Patagonia",
      destination: "Bariloche",
      startDate: "2026-07-10",
      endDate: "2026-07-12",
    }));
    await app.repositories.members.add(tripId, bruno.id, "EDITOR");
    await app.repositories.members.add(tripId, carla.id, "EDITOR");
  });

  const pay = (paidById: string, amount: string, participantIds = [ana.id, bruno.id, carla.id]) =>
    app.budgetService.addExpense(ana.id, tripId, {
      description: "Gasto",
      category: "FOOD",
      amount,
      paidById,
      participantIds,
    });

  const balances = async () =>
    Object.fromEntries(
      (await app.settleUpService.getOverview(ana.id, tripId)).members.map((m) => [m.person.name, m.balanceCents]),
    );

  it("works out who owes whom and how to settle with few transfers", async () => {
    await pay(ana.id, "30.000"); // cabaña for three
    await pay(bruno.id, "6.000", [bruno.id, carla.id]); // excursion for two

    const overview = await app.settleUpService.getOverview(bruno.id, tripId);
    expect(await balances()).toEqual({ Ana: 2_000_000, Bruno: -700_000, Carla: -1_300_000 });
    expect(overview.transfers).toEqual([
      { fromId: carla.id, toId: ana.id, amountCents: 1_300_000 },
      { fromId: bruno.id, toId: ana.id, amountCents: 700_000 },
    ]);
  });

  it("records payments between members, also partial ones, and can undo them", async () => {
    await pay(ana.id, "30.000");
    const payment = await app.settleUpService.record(bruno.id, tripId, {
      fromId: bruno.id,
      toId: ana.id,
      amount: "4.000",
    });
    expect(await balances()).toEqual({ Ana: 1_600_000, Bruno: -600_000, Carla: -1_000_000 });
    expect((await app.settleUpService.getOverview(ana.id, tripId)).settlements).toHaveLength(1);

    await app.settleUpService.delete(ana.id, payment.id);
    expect(await balances()).toEqual({ Ana: 2_000_000, Bruno: -1_000_000, Carla: -1_000_000 });
  });

  it("validates payments", async () => {
    const outsider = app.addUser("Diego");
    const record = (input: Record<string, unknown>) =>
      app.settleUpService.record(ana.id, tripId, { fromId: bruno.id, toId: ana.id, amount: "100", ...input });

    await expect(record({ toId: bruno.id })).rejects.toMatchObject({ fieldErrors: { toId: expect.any(Array) } });
    await expect(record({ amount: "0" })).rejects.toMatchObject({ fieldErrors: { amount: expect.any(Array) } });
    await expect(record({ fromId: outsider.id })).rejects.toBeInstanceOf(ValidationError);
  });

  it("keeps the trip's money private to its members", async () => {
    const outsider = app.addUser("Diego");
    await expect(app.settleUpService.getOverview(outsider.id, tripId)).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      app.settleUpService.record(outsider.id, tripId, { fromId: bruno.id, toId: ana.id, amount: "100" }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(app.settleUpService.delete(ana.id, "missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});
