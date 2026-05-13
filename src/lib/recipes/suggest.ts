type RecipeLike = { id: string; calories_per_serving: number; meal_type: string };

export const MEAL_TYPE_ORDER = ["breakfast", "lunch", "dinner", "snack"] as const;

// Splits recipes into "fits in the remaining calorie budget" vs "doesn't".
// A recipe fits when its serving cost <= remaining budget. If remaining < 0
// (user already over budget), nothing fits.
export function partitionByBudget<T extends RecipeLike>(
  recipes: T[],
  remaining: number,
): { fits: T[]; over: T[] } {
  if (remaining < 0) return { fits: [], over: recipes };
  const fits: T[] = [];
  const over: T[] = [];
  for (const r of recipes) {
    if (r.calories_per_serving <= remaining) fits.push(r);
    else over.push(r);
  }
  return { fits, over };
}

export function groupByMealType<T extends RecipeLike>(
  recipes: T[],
): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const t of MEAL_TYPE_ORDER) out[t] = [];
  for (const r of recipes) {
    const bucket = (MEAL_TYPE_ORDER as readonly string[]).includes(r.meal_type)
      ? r.meal_type
      : "snack";
    (out[bucket] ??= []).push(r);
  }
  return out;
}
