// Converts an ISO timestamp to a local YYYY-MM-DD string. Useful for grouping
// meals by the user's local day boundary instead of UTC.
export function toLocalDateStr(isoStr: string): string {
  const d = new Date(isoStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDateLabel(
  dateStr: string,
  todayStr: string,
  yesterdayStr: string,
): string {
  if (dateStr === todayStr) return "Today";
  if (dateStr === yesterdayStr) return "Yesterday";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
