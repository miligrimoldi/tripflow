import { describe, expect, it } from "vitest";
import { EXACT_LIMIT, minimizeTransfers, type NetBalance, type Transfer } from "./settle-up";

const balances = (entries: Record<string, number>): NetBalance[] =>
  Object.entries(entries).map(([id, cents]) => ({ id, cents }));

/** Applies the transfers and returns what each person still has pending. */
function afterTransfers(start: NetBalance[], transfers: Transfer[]): Map<string, number> {
  const pending = new Map(start.map((b) => [b.id, b.cents]));
  for (const { fromId, toId, amountCents } of transfers) {
    pending.set(fromId, pending.get(fromId)! + amountCents);
    pending.set(toId, pending.get(toId)! - amountCents);
  }
  return pending;
}

function expectSettled(start: NetBalance[], transfers: Transfer[]) {
  // `+ 0` turns -0 into 0 (they are the same amount, but toBe tells them apart).
  for (const cents of afterTransfers(start, transfers).values()) expect(cents + 0).toBe(0);
  for (const transfer of transfers) {
    expect(transfer.amountCents).toBeGreaterThan(0);
    expect(transfer.fromId).not.toBe(transfer.toId);
  }
}

/** Optimum by brute force: n − (most zero-sum blocks over every set partition). */
function bruteForceMinimum(values: number[]): number {
  const nonZero = values.filter((v) => v !== 0);
  let mostBlocks = 0;
  const blocks: number[] = [];
  const visit = (i: number) => {
    if (i === nonZero.length) {
      if (blocks.every((sum) => sum === 0)) mostBlocks = Math.max(mostBlocks, blocks.length);
      return;
    }
    for (let b = 0; b < blocks.length; b++) {
      blocks[b] += nonZero[i];
      visit(i + 1);
      blocks[b] -= nonZero[i];
    }
    blocks.push(nonZero[i]);
    visit(i + 1);
    blocks.pop();
  };
  visit(0);
  return nonZero.length - mostBlocks;
}

/** Deterministic pseudo-random numbers, so failures are reproducible. */
function random(seed: number) {
  return () => {
    seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31;
    return seed / 2 ** 31;
  };
}

describe("minimizeTransfers", () => {
  it("needs nothing when everyone is even", () => {
    expect(minimizeTransfers(balances({ ana: 0, bruno: 0 }))).toEqual([]);
    expect(minimizeTransfers([])).toEqual([]);
  });

  it("settles a simple debt with one transfer", () => {
    expect(minimizeTransfers(balances({ ana: 1500, bruno: -1500 }))).toEqual([
      { fromId: "bruno", toId: "ana", amountCents: 1500 },
    ]);
  });

  it("pays whoever is owed from whoever owes", () => {
    // Ana paid a 3000 dinner for three.
    const start = balances({ ana: 2000, bruno: -1000, carla: -1000 });
    const transfers = minimizeTransfers(start);
    expect(transfers).toHaveLength(2);
    expect(transfers.every((t) => t.toId === "ana")).toBe(true);
    expectSettled(start, transfers);
  });

  it("finds pairs that even out on their own (where greedy would need one more transfer)", () => {
    // Greedy pays the largest debt to the largest credit first (eva → ana 700),
    // then needs 3 more transfers. Pairing ana–diego, bruno–eva and carla–fede takes 3.
    const start = balances({ ana: 600, bruno: 500, carla: 400, diego: -600, eva: -500, fede: -400 });
    const shuffled = balances({ ana: 700, bruno: 300, carla: -400, diego: -600, eva: 300, fede: -300 });

    expect(minimizeTransfers(start)).toHaveLength(3);
    expectSettled(start, minimizeTransfers(start));
    expect(minimizeTransfers(shuffled)).toHaveLength(bruteForceMinimum(shuffled.map((b) => b.cents)));
    expectSettled(shuffled, minimizeTransfers(shuffled));
  });

  it("matches the brute-force optimum on hundreds of random groups", () => {
    const next = random(42);
    for (let round = 0; round < 300; round++) {
      const size = 2 + Math.floor(next() * 6); // 2–7 people
      const values = Array.from({ length: size - 1 }, () => Math.round((next() - 0.5) * 20) * 500);
      values.push(-values.reduce((a, b) => a + b, 0));
      const start = values.map((cents, i) => ({ id: `p${i}`, cents }));

      const transfers = minimizeTransfers(start);
      expectSettled(start, transfers);
      expect(transfers.length).toBe(bruteForceMinimum(values));
    }
  });

  it("still settles everyone in large groups (greedy, at most n − 1 transfers)", () => {
    const size = EXACT_LIMIT + 5;
    const values = Array.from({ length: size - 1 }, (_, i) => (i % 2 === 0 ? 1000 + i : -700 - i));
    values.push(-values.reduce((a, b) => a + b, 0));
    const start = values.map((cents, i) => ({ id: `p${i}`, cents }));

    const transfers = minimizeTransfers(start);
    expectSettled(start, transfers);
    expect(transfers.length).toBeLessThanOrEqual(size - 1);
  });

  it("rejects balances that don't add up to zero", () => {
    expect(() => minimizeTransfers(balances({ ana: 100, bruno: -50 }))).toThrow();
  });
});
