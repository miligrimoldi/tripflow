/**
 * Route optimization for one day of the itinerary.
 *
 * The problem: visit every located activity once, minimizing the total
 * travel cost, without a fixed start or end (an *open path*, the shortest
 * Hamiltonian path), and respecting the order of activities that have a
 * time ("breakfast 9:00" can't come after "lunch 13:00").
 *
 * It's a variant of the Traveling Salesman Problem with precedence
 * constraints (NP-hard), but a trip day is small:
 *
 * - Up to {@link EXACT_LIMIT} stops: exact solution with Held–Karp dynamic
 *   programming, O(n² · 2ⁿ) time — ~600k steps for 12 stops.
 * - Above that: nearest-neighbor construction + 2-opt local search, which
 *   gives near-optimal routes in a few milliseconds.
 */

/** Square matrix of travel costs; `cost[i][j]` is going from i to j (may be asymmetric). */
export type CostMatrix = number[][];

/** `[a, b]` means node `a` must be visited before node `b`. */
export type Precedence = [number, number];

export const EXACT_LIMIT = 12;

export function pathCost(order: number[], cost: CostMatrix): number {
  let total = 0;
  for (let i = 1; i < order.length; i++) total += cost[order[i - 1]][order[i]];
  return total;
}

/** Bitmask of required predecessors for each node. */
function predecessorMasks(n: number, precedence: Precedence[]): number[] {
  const masks = new Array<number>(n).fill(0);
  for (const [before, after] of precedence) masks[after] |= 1 << before;
  return masks;
}

export function respectsPrecedence(order: number[], precedence: Precedence[]): boolean {
  const position = new Map(order.map((node, index) => [node, index]));
  return precedence.every(([before, after]) => position.get(before)! < position.get(after)!);
}

/**
 * Shortest open path visiting all nodes once, honoring `precedence`.
 * Returns node indices in visiting order.
 */
export function shortestPath(cost: CostMatrix, precedence: Precedence[] = []): number[] {
  const n = cost.length;
  if (n <= 1) return n === 0 ? [] : [0];
  return n <= EXACT_LIMIT ? heldKarp(cost, precedence) : heuristicPath(cost, precedence);
}

/**
 * Held–Karp: `best[mask][last]` is the cheapest way to visit exactly the
 * nodes in `mask`, ending at `last`. A node can only be added once all of
 * its required predecessors are already in the mask.
 */
function heldKarp(cost: CostMatrix, precedence: Precedence[]): number[] {
  const n = cost.length;
  const full = (1 << n) - 1;
  const preds = predecessorMasks(n, precedence);
  const best = new Float64Array((full + 1) * n).fill(Infinity);
  const parent = new Int8Array((full + 1) * n).fill(-1);
  const at = (mask: number, last: number) => mask * n + last;

  for (let node = 0; node < n; node++) {
    if (preds[node] === 0) best[at(1 << node, node)] = 0;
  }

  for (let mask = 1; mask <= full; mask++) {
    for (let last = 0; last < n; last++) {
      const current = best[at(mask, last)];
      if (current === Infinity) continue;
      for (let next = 0; next < n; next++) {
        const bit = 1 << next;
        if (mask & bit || (preds[next] & mask) !== preds[next]) continue;
        const candidate = current + cost[last][next];
        const slot = at(mask | bit, next);
        if (candidate < best[slot]) {
          best[slot] = candidate;
          parent[slot] = last;
        }
      }
    }
  }

  let end = 0;
  for (let last = 1; last < n; last++) {
    if (best[at(full, last)] < best[at(full, end)]) end = last;
  }
  if (best[at(full, end)] === Infinity) throw new Error("Precedence constraints are contradictory");

  const order: number[] = [];
  for (let mask = full, node = end; node !== -1;) {
    order.push(node);
    const previous = parent[at(mask, node)];
    mask &= ~(1 << node);
    node = previous;
  }
  return order.reverse();
}

/** Nearest neighbor from every valid start, then 2-opt; keeps the best path found. */
function heuristicPath(cost: CostMatrix, precedence: Precedence[]): number[] {
  const n = cost.length;
  const preds = predecessorMasks(n, precedence);
  let best: number[] | null = null;

  for (let start = 0; start < n; start++) {
    if (preds[start] !== 0) continue;
    const path = twoOpt(nearestNeighbor(start, cost, preds), cost, precedence);
    if (!best || pathCost(path, cost) < pathCost(best, cost)) best = path;
  }
  if (!best) throw new Error("Precedence constraints are contradictory");
  return best;
}

function nearestNeighbor(start: number, cost: CostMatrix, preds: number[]): number[] {
  const n = cost.length;
  const path = [start];
  let visited = 1 << start;
  while (path.length < n) {
    const last = path[path.length - 1];
    let next = -1;
    for (let candidate = 0; candidate < n; candidate++) {
      const available = !(visited & (1 << candidate)) && (preds[candidate] & visited) === preds[candidate];
      if (available && (next === -1 || cost[last][candidate] < cost[last][next])) next = candidate;
    }
    path.push(next);
    visited |= 1 << next;
  }
  return path;
}

/** Reverses segments while that shortens the path and keeps precedence valid. */
function twoOpt(initial: number[], cost: CostMatrix, precedence: Precedence[]): number[] {
  let path = initial;
  let improved = true;
  for (let rounds = 0; improved && rounds < 100; rounds++) {
    improved = false;
    for (let i = 0; i < path.length - 1; i++) {
      for (let k = i + 1; k < path.length; k++) {
        const candidate = [...path.slice(0, i), ...path.slice(i, k + 1).reverse(), ...path.slice(k + 1)];
        if (pathCost(candidate, cost) + 1e-9 < pathCost(path, cost) && respectsPrecedence(candidate, precedence)) {
          path = candidate;
          improved = true;
        }
      }
    }
  }
  return path;
}

export interface DayStop {
  id: string;
  /** False for activities without a point on the map: they keep their slot. */
  located: boolean;
  /** "HH:mm" or null. Timed stops keep their chronological order. */
  startTime: string | null;
}

export interface DayRoutePlan {
  /** All stop ids, in the suggested order. */
  order: string[];
  currentCost: number;
  suggestedCost: number;
  changed: boolean;
}

/**
 * Precedence constraints from activity times (indices refer to `located`):
 *
 * 1. Timed activities keep their chronological order.
 * 2. Timed activities act as anchors: an untimed activity stays between the
 *    same timed activities it is between now ("museum" planned between
 *    breakfast and dinner won't be moved before breakfast). Only applied when
 *    the timed activities are already in chronological order; otherwise the
 *    positional anchors would contradict rule 1.
 */
function timeConstraints(located: DayStop[]): Precedence[] {
  const timed = located
    .map((stop, index) => ({ index, time: stop.startTime }))
    .filter((stop): stop is { index: number; time: string } => stop.time !== null);
  const chronological = [...timed].sort((a, b) => a.time.localeCompare(b.time));

  const precedence: Precedence[] = [];
  for (let i = 1; i < chronological.length; i++) {
    if (chronological[i - 1].time !== chronological[i].time) {
      precedence.push([chronological[i - 1].index, chronological[i].index]);
    }
  }

  const alreadyChronological = timed.every((stop, i) => i === 0 || timed[i - 1].time <= stop.time);
  if (!alreadyChronological) return precedence;

  located.forEach((stop, index) => {
    if (stop.startTime !== null) return;
    const before = timed.findLast((anchor) => anchor.index < index);
    const after = timed.find((anchor) => anchor.index > index);
    if (before) precedence.push([before.index, index]);
    if (after) precedence.push([index, after.index]);
  });
  return precedence;
}

/**
 * Plans a day: optimizes the located stops (whose costs are in `cost`, in the
 * order they appear in `stops`) and leaves unlocated stops in their slots.
 * If no order is strictly better, the current one is kept (no pointless
 * reshuffles between equally good routes).
 */
export function planDayRoute(stops: DayStop[], cost: CostMatrix): DayRoutePlan {
  const located = stops.filter((stop) => stop.located);
  if (located.length !== cost.length) throw new Error("Cost matrix size must match the located stops");

  const precedence = timeConstraints(located);

  const current = located.map((_, index) => index);
  const currentCost = pathCost(current, cost);
  const optimal = shortestPath(cost, precedence);
  const optimalCost = pathCost(optimal, cost);

  // Keep the current order unless the new one is meaningfully shorter (> 0.5%)
  // and the current one is valid (it may break the time order).
  const keepCurrent = respectsPrecedence(current, precedence) && optimalCost >= currentCost * 0.995;
  const chosen = keepCurrent ? current : optimal;

  const reordered = chosen.map((index) => located[index].id);
  let next = 0;
  const order = stops.map((stop) => (stop.located ? reordered[next++] : stop.id));

  return {
    order,
    currentCost,
    suggestedCost: keepCurrent ? currentCost : optimalCost,
    changed: order.some((id, index) => id !== stops[index].id),
  };
}
