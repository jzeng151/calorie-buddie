export const MEAL_TYPES = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
] as const;

export type MealType = (typeof MEAL_TYPES)[number]["value"];

export function isValidMealType(v: string | null): v is MealType {
  return v === "breakfast" || v === "lunch" || v === "dinner" || v === "snack";
}

// Parses a query-string calories value. Rejects NaN, Infinity, negatives, and
// >100_000 (a reasonable upper bound; no real meal hits that). Returns ""
// instead of an invalid number so the form input stays controlled.
const MAX_PREFILL_CAL = 100_000;
export function parsePrefillCalories(raw: string | null): number | "" {
  if (raw === null || raw === "") return "";
  const n = Number(raw);
  if (!Number.isFinite(n)) return "";
  if (n <= 0 || n > MAX_PREFILL_CAL) return "";
  return Math.round(n);
}

const MAX_PREFILL_NAME = 200;
export function parsePrefillName(raw: string | null): string {
  if (!raw) return "";
  return raw.slice(0, MAX_PREFILL_NAME);
}
