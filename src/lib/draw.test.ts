import { describe, expect, it } from "vitest";
import { generateAssignment, type Pair } from "./draw";
import { openReceiver, sealReceiver } from "./crypto";
import { randomBytes } from "node:crypto";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);

function assertValid(m: Map<string, string>, people: string[], ex: Pair[] = []) {
  expect(m.size).toBe(people.length);
  expect(new Set(m.values()).size).toBe(people.length);
  for (const [g, r] of m) {
    expect(g).not.toBe(r);
    for (const [a, b] of ex) expect([g, r].sort()).not.toEqual([a, b].sort());
  }
}

describe("generateAssignment", () => {
  it("never assigns self, is a permutation", () => {
    for (let n = 2; n <= 30; n++) {
      for (let k = 0; k < 20; k++) assertValid(generateAssignment(ids(n))!, ids(n));
    }
  });

  it("respects exclusions", () => {
    const people = ids(6);
    const ex: Pair[] = [["p0", "p1"], ["p2", "p3"], ["p4", "p5"]];
    for (let k = 0; k < 200; k++) assertValid(generateAssignment(people, ex)!, people, ex);
  });

  it("returns null when impossible", () => {
    expect(generateAssignment(["a"])).toBeNull();
    expect(generateAssignment(["a", "b"], [["a", "b"]])).toBeNull();
    expect(generateAssignment(["a", "b", "c"], [["a", "b"], ["a", "c"]])).toBeNull();
  });

  it("falls back when no single cycle exists but an assignment does", () => {
    // a can only give to b; works only with swaps
    const people = ["a", "b", "c", "d"];
    const ex: Pair[] = [["a", "c"], ["a", "d"], ["b", "c"], ["b", "d"]];
    const m = generateAssignment(people, ex)!;
    assertValid(m, people, ex);
  });
});

describe("assignment sealing", () => {
  it("round-trips and is bound to the giver", () => {
    const key = randomBytes(32);
    const sealed = sealReceiver("giver-1", "receiver-1", key);
    expect(sealed).not.toContain("receiver-1");
    expect(openReceiver("giver-1", sealed, key)).toBe("receiver-1");
    expect(() => openReceiver("giver-2", sealed, key)).toThrow();
  });
});
