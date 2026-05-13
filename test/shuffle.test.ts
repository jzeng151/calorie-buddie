import { describe, it, expect } from "vitest";
import { shuffle } from "@/lib/random/shuffle";

describe("shuffle", () => {
  it("returns a new array (does not mutate input)", () => {
    const input = [1, 2, 3, 4];
    const result = shuffle(input, () => 0);
    expect(result).not.toBe(input);
    expect(input).toEqual([1, 2, 3, 4]);
  });

  it("preserves length and members (permutation)", () => {
    const input = ["a", "b", "c", "d", "e"];
    const result = shuffle(input, Math.random);
    expect(result.length).toBe(input.length);
    expect([...result].sort()).toEqual([...input].sort());
  });

  it("is deterministic given a fixed rng", () => {
    const rng = () => 0.5;
    expect(shuffle([1, 2, 3], rng)).toEqual(shuffle([1, 2, 3], rng));
  });

  it("handles empty array", () => {
    expect(shuffle([], Math.random)).toEqual([]);
  });

  it("handles single-element array", () => {
    expect(shuffle([42], Math.random)).toEqual([42]);
  });
});
