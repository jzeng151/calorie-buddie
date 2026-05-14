import { describe, it, expect } from "vitest";
import { ringState } from "@/lib/calorie/ring";

describe("ringState", () => {
  it("0 of 2000 → 0% not over", () => {
    expect(ringState(0, 2000)).toEqual({ pct: 0, over: false, remaining: 2000 });
  });

  it("1000 of 2000 → 50% not over", () => {
    expect(ringState(1000, 2000)).toEqual({ pct: 50, over: false, remaining: 1000 });
  });

  it("2000 of 2000 → 100% not over (exact)", () => {
    expect(ringState(2000, 2000)).toEqual({ pct: 100, over: false, remaining: 0 });
  });

  it("2001 of 2000 → 100% AND over flag", () => {
    const s = ringState(2001, 2000);
    expect(s.pct).toBe(100);
    expect(s.over).toBe(true);
    expect(s.remaining).toBe(-1);
  });

  it("clamps absurd consumption to 999%", () => {
    expect(ringState(1_000_000, 2000).pct).toBe(999);
  });

  it("guards against zero target (no NaN)", () => {
    const s = ringState(100, 0);
    expect(Number.isFinite(s.pct)).toBe(true);
    expect(s.over).toBe(true);
  });

  it("rounds to whole percent", () => {
    expect(ringState(333, 1000).pct).toBe(33);
    expect(ringState(666, 1000).pct).toBe(67);
  });
});
