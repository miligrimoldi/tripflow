import { describe, expect, it } from "vitest";
import { computeBalances, expenseShares } from "./balances";
import type { Expense, Person } from "./expense";
import type { Settlement } from "./settlement";

const ana: Person = { id: "ana", name: "Ana" };
const bruno: Person = { id: "bruno", name: "Bruno" };
const carla: Person = { id: "carla", name: "Carla" };

const expense = (amountCents: number, paidBy: Person | null, participants: Person[]): Expense => ({
  id: `e-${amountCents}`,
  tripId: "trip",
  description: "gasto",
  category: "FOOD",
  amountCents,
  activity: null,
  paidBy,
  participants,
  createdBy: ana,
  createdAt: new Date(),
});

const settlement = (from: Person, to: Person, amountCents: number): Settlement => ({
  id: `s-${amountCents}`,
  tripId: "trip",
  from,
  to,
  amountCents,
  createdBy: from,
  createdAt: new Date(),
});

const byName = (result: ReturnType<typeof computeBalances>) =>
  Object.fromEntries(result.members.map((m) => [m.person.name, m.balanceCents]));

describe("expenseShares", () => {
  it("splits evenly and gives the leftover cents to the first ids, whatever the order", () => {
    const shares = expenseShares({ amountCents: 1000, participants: [carla, ana, bruno] });
    expect(Object.fromEntries(shares)).toEqual({ ana: 334, bruno: 333, carla: 333 });
  });
});

describe("computeBalances", () => {
  it("credits the payer and debits each participant's share", () => {
    // Ana paid a 3000 dinner for the three of them.
    const result = computeBalances([ana, bruno, carla], [expense(3000, ana, [ana, bruno, carla])], []);

    expect(result.members.map((m) => [m.person.name, m.paidCents, m.shareCents, m.balanceCents])).toEqual([
      ["Ana", 3000, 1000, 2000],
      ["Bruno", 0, 1000, -1000],
      ["Carla", 0, 1000, -1000],
    ]);
    expect(result.transfers).toEqual([
      { fromId: "bruno", toId: "ana", amountCents: 1000 },
      { fromId: "carla", toId: "ana", amountCents: 1000 },
    ]);
  });

  it("only splits among the participants", () => {
    // Bruno paid a 2000 excursion just for him and Carla.
    const result = computeBalances([ana, bruno, carla], [expense(2000, bruno, [bruno, carla])], []);
    expect(byName(result)).toEqual({ Ana: 0, Bruno: 1000, Carla: -1000 });
  });

  it("ignores estimates nobody has paid yet", () => {
    const result = computeBalances([ana, bruno], [expense(5000, null, [ana, bruno])], []);
    expect(byName(result)).toEqual({ Ana: 0, Bruno: 0 });
    expect(result.transfers).toEqual([]);
  });

  it("moves balances toward zero with settlements, including partial ones", () => {
    const expenses = [expense(3000, ana, [ana, bruno, carla])];

    const partial = computeBalances([ana, bruno, carla], expenses, [settlement(bruno, ana, 400)]);
    expect(byName(partial)).toEqual({ Ana: 1600, Bruno: -600, Carla: -1000 });

    const settled = computeBalances([ana, bruno, carla], expenses, [
      settlement(bruno, ana, 1000),
      settlement(carla, ana, 1000),
    ]);
    expect(byName(settled)).toEqual({ Ana: 0, Bruno: 0, Carla: 0 });
    expect(settled.transfers).toEqual([]);
  });

  it("nets out expenses paid by different people", () => {
    const result = computeBalances(
      [ana, bruno],
      [expense(4000, ana, [ana, bruno]), expense(1000, bruno, [ana, bruno])],
      [],
    );
    expect(byName(result)).toEqual({ Ana: 1500, Bruno: -1500 });
    expect(result.transfers).toEqual([{ fromId: "bruno", toId: "ana", amountCents: 1500 }]);
  });

  it("keeps people who left the trip, after the current members", () => {
    const result = computeBalances([ana], [expense(2000, ana, [ana, bruno])], []);
    expect(result.members.map((m) => [m.person.name, m.isMember, m.balanceCents])).toEqual([
      ["Ana", true, 1000],
      ["Bruno", false, -1000],
    ]);
  });

  it("charges the payer alone when nobody else is left in the expense", () => {
    const result = computeBalances([ana, bruno], [expense(2000, ana, [])], []);
    expect(byName(result)).toEqual({ Ana: 0, Bruno: 0 });
  });
});
