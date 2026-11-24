import { splitEvenly } from "../shared/money";
import type { Expense, Person } from "./expense";
import type { Settlement } from "./settlement";
import { minimizeTransfers, type Transfer } from "./settle-up";

export interface MemberBalance {
  person: Person;
  /** False for people who left the trip but still appear in its expenses. */
  isMember: boolean;
  /** Paid out of pocket for the group. */
  paidCents: number;
  /** Their part of what was paid. */
  shareCents: number;
  /** Positive: the group owes them. Negative: they owe the group. */
  balanceCents: number;
}

export interface Balances {
  members: MemberBalance[];
  /** The fewest transfers that leave everyone even. */
  transfers: Transfer[];
}

/**
 * Each participant's part of an expense, in cents. The cents that don't
 * divide evenly go to the first participants by id, so everyone (and every
 * request) computes exactly the same split and the parts add up to the total.
 */
export function expenseShares(expense: Pick<Expense, "amountCents" | "participants">): Map<string, number> {
  const ids = expense.participants.map((p) => p.id).sort();
  const parts = splitEvenly(expense.amountCents, ids.length);
  return new Map(ids.map((id, i) => [id, parts[i]]));
}

/**
 * Who owes whom. Only paid expenses count (estimates don't create debts
 * yet), and settlements already made move the balances toward zero.
 */
export function computeBalances(members: Person[], expenses: Expense[], settlements: Settlement[]): Balances {
  const rows = new Map<string, MemberBalance>();
  const row = (person: Person) => {
    let found = rows.get(person.id);
    if (!found) {
      found = { person, isMember: false, paidCents: 0, shareCents: 0, balanceCents: 0 };
      rows.set(person.id, found);
    }
    return found;
  };
  for (const member of members) row(member).isMember = true;

  for (const expense of expenses) {
    if (!expense.paidBy) continue;
    row(expense.paidBy).paidCents += expense.amountCents;
    // Nobody left to split with (e.g. their accounts were deleted): the payer
    // keeps the whole cost, so balances still add up to zero.
    const participants = expense.participants.length > 0 ? expense.participants : [expense.paidBy];
    const shares = expenseShares({ ...expense, participants });
    for (const participant of participants) row(participant).shareCents += shares.get(participant.id)!;
  }
  for (const balance of rows.values()) balance.balanceCents = balance.paidCents - balance.shareCents;

  for (const { from, to, amountCents } of settlements) {
    row(from).balanceCents += amountCents;
    row(to).balanceCents -= amountCents;
  }

  const all = [...rows.values()];
  return {
    // Members first (in the given order), then people who left.
    members: [...all.filter((b) => b.isMember), ...all.filter((b) => !b.isMember)],
    transfers: minimizeTransfers(all.map((b) => ({ id: b.person.id, cents: b.balanceCents }))),
  };
}
