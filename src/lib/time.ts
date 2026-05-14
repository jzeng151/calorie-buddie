// Canonical day boundary for daily meal/budget queries. Anchored at UTC
// midnight so server components, client components, and direct Supabase RPCs
// (which use date_trunc('day', NOW()) — also UTC) all agree on which logs
// belong to "today" for the same account.
//
// Trade-off: a user in EDT sees their day flip at 8pm local. Proper per-user
// timezone support is tracked in TODOS.md. Until then, one canonical anchor
// beats four mismatched ones.
export function startOfTodayUtcIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}
