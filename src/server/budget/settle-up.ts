/** "`fromId` pays `amountCents` to `toId`". */
export interface Transfer {
  fromId: string;
  toId: string;
  amountCents: number;
}

/** Positive: the group owes this person. Negative: this person owes the group. */
export interface NetBalance {
  id: string;
  cents: number;
}

/**
 * Up to this many people with a non-zero balance, the minimum is computed
 * exactly: 2^15 subsets is instant. Real trips stay far below.
 */
export const EXACT_LIMIT = 15;

/**
 * The fewest transfers that leave everyone even.
 *
 * Any group whose balances add up to zero can settle with (size − 1)
 * transfers, so minimizing transfers means splitting people into as many
 * zero-sum groups as possible: "Ana and Bruno even out between them, Carla,
 * Diego and Eva among themselves" takes 1 + 2 transfers instead of 4.
 * Finding that partition is NP-hard in general (it contains subset-sum), but
 * a dynamic program over subsets solves it exactly for real group sizes.
 * Larger groups fall back to the greedy rule (at most n − 1 transfers).
 */
export function minimizeTransfers(balances: NetBalance[]): Transfer[] {
  const people = balances.filter((balance) => balance.cents !== 0);
  if (people.reduce((sum, person) => sum + person.cents, 0) !== 0) {
    throw new Error("Balances must add up to zero");
  }
  if (people.length > EXACT_LIMIT) return settleGreedily(people);
  return zeroSumGroups(people).flatMap(settleGreedily);
}

/**
 * Partition of `people` into the maximum number of groups that add up to
 * zero, with a DP over bitmasks: `best[mask]` is the most zero-sum groups
 * the people in `mask` can be split into, when they are removed one at a
 * time (every time the remaining set adds up to zero, a group closes).
 */
function zeroSumGroups(people: NetBalance[]): NetBalance[][] {
  const n = people.length;
  const full = (1 << n) - 1;
  const sum = new Array<number>(1 << n).fill(0);
  const best = new Array<number>(1 << n).fill(0);
  const removed = new Array<number>(1 << n).fill(-1);

  for (let mask = 1; mask <= full; mask++) {
    const lowest = 31 - Math.clz32(mask & -mask);
    sum[mask] = sum[mask & (mask - 1)] + people[lowest].cents;

    for (let i = 0; i < n; i++) {
      if (!(mask & (1 << i))) continue;
      const rest = mask ^ (1 << i);
      if (removed[mask] === -1 || best[rest] > best[mask]) {
        best[mask] = best[rest];
        removed[mask] = i;
      }
    }
    if (sum[mask] === 0) best[mask] += 1;
  }

  // Walk back from everyone: the sets that add up to zero along the way are
  // nested, and the difference between consecutive ones is a group.
  const groups: NetBalance[][] = [];
  let current: NetBalance[] = [];
  for (let mask = full; mask !== 0; mask ^= 1 << removed[mask]) {
    if (sum[mask] === 0 && current.length > 0) {
      groups.push(current);
      current = [];
    }
    current.push(people[removed[mask]]);
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

/**
 * Repeatedly the one who owes the most pays the one who is owed the most.
 * Each transfer settles at least one person, so a group of n needs at most
 * n − 1 transfers (optimal when the group has no zero-sum subgroup).
 */
function settleGreedily(group: NetBalance[]): Transfer[] {
  const debtors = group.filter((p) => p.cents < 0).map((p) => ({ id: p.id, cents: -p.cents }));
  const creditors = group.filter((p) => p.cents > 0).map((p) => ({ ...p }));
  const byAmount = (a: { cents: number; id: string }, b: { cents: number; id: string }) =>
    b.cents - a.cents || a.id.localeCompare(b.id);

  const transfers: Transfer[] = [];
  while (debtors.length > 0 && creditors.length > 0) {
    debtors.sort(byAmount);
    creditors.sort(byAmount);
    const debtor = debtors[0];
    const creditor = creditors[0];
    const amountCents = Math.min(debtor.cents, creditor.cents);
    transfers.push({ fromId: debtor.id, toId: creditor.id, amountCents });

    debtor.cents -= amountCents;
    creditor.cents -= amountCents;
    if (debtor.cents === 0) debtors.shift();
    if (creditor.cents === 0) creditors.shift();
  }
  return transfers;
}
