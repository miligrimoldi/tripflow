import { describe, expect, it } from "vitest";
import {
  EXACT_LIMIT,
  pathCost,
  planDayRoute,
  respectsPrecedence,
  shortestPath,
  type CostMatrix,
  type Precedence,
} from "./route-optimizer";

/** Deterministic pseudo-random numbers (mulberry32) so failures are reproducible. */
function random(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Euclidean distances between random points in a 10×10 square. */
function randomMatrix(n: number, rand: () => number): CostMatrix {
  const points = Array.from({ length: n }, () => [rand() * 10, rand() * 10]);
  return points.map(([x1, y1]) => points.map(([x2, y2]) => Math.hypot(x1 - x2, y1 - y2)));
}

function permutations(items: number[]): number[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]),
  );
}

/** The reference answer: try every order. */
function bruteForce(cost: CostMatrix, precedence: Precedence[]): number {
  const all = permutations(cost.map((_, i) => i)).filter((order) => respectsPrecedence(order, precedence));
  return Math.min(...all.map((order) => pathCost(order, cost)));
}

const isPermutation = (order: number[], n: number) =>
  order.length === n && [...order].sort((a, b) => a - b).every((value, index) => value === index);

describe("shortestPath (exact)", () => {
  it("handles trivial sizes", () => {
    expect(shortestPath([])).toEqual([]);
    expect(shortestPath([[0]])).toEqual([0]);
    expect(isPermutation(shortestPath(randomMatrix(2, random(1))), 2)).toBe(true);
  });

  it("matches brute force on 300 random days", () => {
    const rand = random(42);
    for (let run = 0; run < 300; run++) {
      const n = 2 + Math.floor(rand() * 6); // 2..7 stops
      const cost = randomMatrix(n, rand);
      const order = shortestPath(cost);
      expect(isPermutation(order, n)).toBe(true);
      expect(pathCost(order, cost)).toBeCloseTo(bruteForce(cost, []), 9);
    }
  });

  it("matches brute force with time constraints", () => {
    const rand = random(7);
    for (let run = 0; run < 200; run++) {
      const n = 3 + Math.floor(rand() * 5); // 3..7 stops
      const cost = randomMatrix(n, rand);
      // A random chain of 2–3 timed stops, like "9:00 → 13:00 → 20:00".
      const timed = permutations(cost.map((_, i) => i))[Math.floor(rand() * n)].slice(0, 2 + (run % 2));
      const precedence: Precedence[] = timed.slice(1).map((node, i) => [timed[i], node]);

      const order = shortestPath(cost, precedence);
      expect(respectsPrecedence(order, precedence)).toBe(true);
      expect(pathCost(order, cost)).toBeCloseTo(bruteForce(cost, precedence), 9);
    }
  });

  it("solves the largest exact size quickly", () => {
    const cost = randomMatrix(EXACT_LIMIT, random(3));
    const started = performance.now();
    expect(isPermutation(shortestPath(cost), EXACT_LIMIT)).toBe(true);
    expect(performance.now() - started).toBeLessThan(1000);
  });
});

describe("shortestPath (heuristic, more than EXACT_LIMIT stops)", () => {
  it("finds the obvious route along a line, whatever the input order", () => {
    // 20 stops on a straight line, shuffled: the best path walks it end to end.
    const positions = [7, 2, 15, 0, 19, 11, 4, 16, 9, 1, 13, 18, 5, 10, 3, 17, 8, 14, 6, 12];
    const cost = positions.map((a) => positions.map((b) => Math.abs(a - b)));
    expect(pathCost(shortestPath(cost), cost)).toBe(19);
  });

  it("returns valid orders that respect time constraints", () => {
    const cost = randomMatrix(18, random(9));
    const precedence: Precedence[] = [
      [5, 2],
      [2, 14],
    ];
    const order = shortestPath(cost, precedence);
    expect(isPermutation(order, 18)).toBe(true);
    expect(respectsPrecedence(order, precedence)).toBe(true);
  });
});

describe("planDayRoute", () => {
  // Stops on a line at km 0, 10, 1, 11: visiting in that order zigzags (29 km).
  const line = (positions: number[]) => positions.map((a) => positions.map((b) => Math.abs(a - b)));
  const stop = (id: string, startTime: string | null = null, located = true) => ({ id, startTime, located });

  it("reorders to remove zigzags", () => {
    const plan = planDayRoute([stop("a"), stop("b"), stop("c"), stop("d")], line([0, 10, 1, 11]));
    expect(plan).toMatchObject({ currentCost: 29, suggestedCost: 11, changed: true });
    expect(["a,c,b,d", "d,b,c,a"]).toContain(plan.order.join(","));
  });

  it("keeps activities with a time in chronological order", () => {
    const plan = planDayRoute([stop("a", "09:00"), stop("b"), stop("c"), stop("d", "08:00")], line([0, 10, 1, 11]));
    expect(plan.order.indexOf("d")).toBeLessThan(plan.order.indexOf("a"));
  });

  it("keeps untimed activities between the same timed ones (breakfast stays first, dinner last)", () => {
    // Breakfast (9:00) and dinner (21:00) are at km 0; the rest is spread out.
    // Without anchoring, the shortest path would put visits before breakfast.
    const plan = planDayRoute(
      [stop("breakfast", "09:00"), stop("far"), stop("near"), stop("middle"), stop("dinner", "21:00")],
      line([0, 20, 2, 10, 0]),
    );
    expect(plan.order).toEqual(["breakfast", "near", "middle", "far", "dinner"]);
  });

  it("only anchors to timed activities that are already in chronological order", () => {
    // Dinner listed before breakfast: anchoring by position would be contradictory,
    // so only the time order is enforced.
    const plan = planDayRoute([stop("dinner", "21:00"), stop("visit"), stop("breakfast", "09:00")], line([0, 5, 1]));
    expect(plan.order.indexOf("breakfast")).toBeLessThan(plan.order.indexOf("dinner"));
  });

  it("leaves activities without a location in their slot", () => {
    const plan = planDayRoute(
      [stop("a"), stop("nowhere", null, false), stop("b"), stop("c"), stop("d")],
      line([0, 10, 1, 11]),
    );
    expect(plan.order[1]).toBe("nowhere");
    expect(plan.order).toHaveLength(5);
  });

  it("does not suggest changes when the day is already optimal", () => {
    const plan = planDayRoute([stop("a"), stop("b"), stop("c")], line([0, 1, 2]));
    expect(plan).toMatchObject({ order: ["a", "b", "c"], changed: false, suggestedCost: 2 });
  });
});
