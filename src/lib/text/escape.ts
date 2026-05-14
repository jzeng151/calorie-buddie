// Escapes Postgres ILIKE/LIKE metacharacters so user input is treated as a
// literal substring rather than a pattern. Use with `ESCAPE '\'` server-side.
export function escapeIlike(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}
