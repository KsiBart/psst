import { randomInt } from "node:crypto";

export type Pair = [string, string];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function blockedSet(exclusions: Pair[]) {
  const s = new Set<string>();
  for (const [a, b] of exclusions) {
    s.add(`${a}>${b}`);
    s.add(`${b}>${a}`);
  }
  return s;
}

/**
 * Returns a map giver -> receiver where nobody draws themself and no excluded pair
 * (symmetric) is matched. Prefers one big circle (A→B→C→…→A, so nobody simply swaps
 * gifts with each other); falls back to any valid assignment. Returns null if impossible.
 */
export function generateAssignment(ids: string[], exclusions: Pair[] = []): Map<string, string> | null {
  if (ids.length < 2) return null;
  const blocked = blockedSet(exclusions);
  const ok = (g: string, r: string) => g !== r && !blocked.has(`${g}>${r}`);

  // 1) Random single cycle.
  for (let attempt = 0; attempt < 200; attempt++) {
    const order = shuffle(ids);
    let valid = true;
    for (let i = 0; i < order.length; i++) {
      if (!ok(order[i], order[(i + 1) % order.length])) {
        valid = false;
        break;
      }
    }
    if (valid) {
      const m = new Map<string, string>();
      order.forEach((g, i) => m.set(g, order[(i + 1) % order.length]));
      return m;
    }
  }

  // 2) Any valid assignment: randomized backtracking (small groups, so this is fast).
  const givers = shuffle(ids);
  const used = new Set<string>();
  const result = new Map<string, string>();
  const solve = (i: number): boolean => {
    if (i === givers.length) return true;
    const g = givers[i];
    for (const r of shuffle(ids)) {
      if (used.has(r) || !ok(g, r)) continue;
      used.add(r);
      result.set(g, r);
      if (solve(i + 1)) return true;
      used.delete(r);
      result.delete(g);
    }
    return false;
  };
  return solve(0) ? result : null;
}
