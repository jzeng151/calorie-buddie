import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

type MealRow = {
  id: string;
  name: string;
  calories_per_serving: number;
  servings: number;
  meal_type: string;
  logged_at: string;
};

type DaySummary = {
  date: string;         // "2026-04-22"
  label: string;        // "Today" | "Yesterday" | "Mon 21 Apr"
  meals: MealRow[];
  total: number;
};

function formatDateLabel(dateStr: string, todayStr: string, yesterdayStr: string): string {
  if (dateStr === todayStr) return "Today";
  if (dateStr === yesterdayStr) return "Yesterday";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
}

function toLocalDateStr(isoStr: string): string {
  const d = new Date(isoStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileResult, mealsResult] = await Promise.all([
    supabase
      .from("users")
      .select("daily_calorie_target")
      .eq("id", user.id)
      .single(),
    supabase
      .from("meals_log")
      .select("id, name, calories_per_serving, servings, meal_type, logged_at")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false })
      .limit(200),
  ]);

  const target = profileResult.data?.daily_calorie_target ?? 2000;
  const meals: MealRow[] = (mealsResult.data ?? []).map((m) => ({
    ...m,
    servings: Number(m.servings),
  }));

  const now = new Date();
  const todayStr = toLocalDateStr(now.toISOString());
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = toLocalDateStr(yesterday.toISOString());

  // Group by local date
  const byDate = new Map<string, MealRow[]>();
  for (const meal of meals) {
    const dateStr = toLocalDateStr(meal.logged_at);
    if (!byDate.has(dateStr)) byDate.set(dateStr, []);
    byDate.get(dateStr)!.push(meal);
  }

  const days: DaySummary[] = Array.from(byDate.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, dayMeals]) => ({
      date,
      label: formatDateLabel(date, todayStr, yesterdayStr),
      meals: dayMeals.sort(
        (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
      ),
      total: dayMeals.reduce(
        (sum, m) => sum + Math.round(m.calories_per_serving * m.servings),
        0
      ),
    }));

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>History</h1>

      {days.length === 0 ? (
        <div style={emptyCardStyle}>
          <p style={emptyStyle}>No meals logged yet. Head to the home screen to get started.</p>
        </div>
      ) : (
        days.map((day) => (
          <DayCard key={day.date} day={day} target={target} />
        ))
      )}
    </div>
  );
}

function DayCard({ day, target }: { day: DaySummary; target: number }) {
  const pct = Math.round((day.total / target) * 100);
  const over = day.total > target;
  const barWidth = Math.min(100, pct);

  return (
    <div style={cardStyle}>
      {/* Day header */}
      <div style={dayHeaderStyle}>
        <span style={dayLabelStyle}>{day.label}</span>
        <span style={dayTotalStyle(over)}>
          {day.total.toLocaleString()} / {target.toLocaleString()} kcal
          {over && <span style={overTagStyle}> over</span>}
        </span>
      </div>

      {/* Progress bar */}
      <div style={trackStyle}>
        <div style={barStyle(barWidth, over)} />
      </div>

      {/* Meals */}
      <ul style={mealListStyle}>
        {day.meals.map((meal) => (
          <li key={meal.id} style={mealRowStyle}>
            <div>
              <span style={mealNameStyle}>{meal.name}</span>
              <span style={mealMetaStyle}>
                {MEAL_TYPE_LABELS[meal.meal_type]}
                {meal.servings !== 1 && ` · ${meal.servings}×`}
              </span>
            </div>
            <span style={mealCalStyle}>
              {Math.round(meal.calories_per_serving * meal.servings).toLocaleString()} kcal
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: 600,
  margin: "0 auto",
  padding: "1.5rem 1rem 4rem",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
};

const titleStyle: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "var(--color-text-dark)",
  margin: "0 0 0.25rem",
};

const cardStyle: React.CSSProperties = {
  background: "var(--color-body-bg)",
  border: "1px solid var(--color-border)",
  borderRadius: "1rem",
  padding: "1.25rem 1.5rem",
  boxShadow: "0 2px 12px var(--color-shadow)",
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
};

const emptyCardStyle: React.CSSProperties = {
  ...cardStyle,
};

const emptyStyle: React.CSSProperties = {
  fontSize: "0.9375rem",
  color: "var(--color-text-hover)",
  margin: 0,
};

const dayHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  flexWrap: "wrap",
  gap: "0.5rem",
};

const dayLabelStyle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 700,
  color: "var(--color-text-dark)",
};

const dayTotalStyle = (over: boolean): React.CSSProperties => ({
  fontSize: "0.875rem",
  fontWeight: 600,
  color: over ? "#c0392b" : "var(--color-text-hover)",
});

const overTagStyle: React.CSSProperties = {
  fontWeight: 700,
};

const trackStyle: React.CSSProperties = {
  height: 6,
  borderRadius: 3,
  background: "var(--color-border)",
  overflow: "hidden",
};

const barStyle = (width: number, over: boolean): React.CSSProperties => ({
  height: "100%",
  width: `${width}%`,
  borderRadius: 3,
  background: over ? "#c0392b" : "var(--color-text-hover)",
  transition: "width 0.4s ease",
});

const mealListStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
};

const mealRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const mealNameStyle: React.CSSProperties = {
  fontSize: "0.9375rem",
  fontWeight: 600,
  color: "var(--color-text-dark)",
  display: "block",
};

const mealMetaStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "var(--color-text-hover)",
  display: "block",
};

const mealCalStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 700,
  color: "var(--color-text-dark)",
  whiteSpace: "nowrap",
};
