import { describe, it, expect } from "vitest";
import {
  partitionByBudget,
  groupByMealType,
  MEAL_TYPE_ORDER,
} from "@/lib/recipes/suggest";

const r = (id: string, cal: number, type = "lunch") => ({
  id,
  calories_per_serving: cal,
  meal_type: type,
});

describe("partitionByBudget", () => {
  it("everything fits when budget is huge", () => {
    const out = partitionByBudget([r("a", 100), r("b", 500)], 2000);
    expect(out.fits.length).toBe(2);
    expect(out.over.length).toBe(0);
  });

  it("nothing fits when remaining is negative", () => {
    const out = partitionByBudget([r("a", 100)], -50);
    expect(out.fits).toEqual([]);
    expect(out.over.length).toBe(1);
  });

  it("inclusive at the boundary (== remaining fits)", () => {
    const out = partitionByBudget([r("a", 500)], 500);
    expect(out.fits.map((x) => x.id)).toEqual(["a"]);
    expect(out.over).toEqual([]);
  });

  it("splits correctly when some fit and some don't", () => {
    const out = partitionByBudget(
      [r("a", 100), r("b", 800), r("c", 400)],
      500,
    );
    expect(out.fits.map((x) => x.id).sort()).toEqual(["a", "c"]);
    expect(out.over.map((x) => x.id)).toEqual(["b"]);
  });
});

describe("groupByMealType", () => {
  it("buckets every order key (even when empty)", () => {
    const out = groupByMealType([]);
    for (const t of MEAL_TYPE_ORDER) expect(out[t]).toEqual([]);
  });

  it("places recipes in their declared meal type", () => {
    const out = groupByMealType([r("a", 200, "breakfast"), r("b", 500, "dinner")]);
    expect(out.breakfast.map((x) => x.id)).toEqual(["a"]);
    expect(out.dinner.map((x) => x.id)).toEqual(["b"]);
  });

  it("falls back to snack for unknown types", () => {
    const out = groupByMealType([r("a", 200, "brunch")]);
    expect(out.snack.map((x) => x.id)).toEqual(["a"]);
  });
});
