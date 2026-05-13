import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const MEAL_SLOTS = [
  { type: "breakfast", label: "Breakfast", emoji: "🌅" },
  { type: "lunch",     label: "Lunch",     emoji: "☀️"  },
  { type: "dinner",    label: "Dinner",    emoji: "🌙"  },
  { type: "snack",     label: "Snacks",    emoji: "🍿"  },
] as const;

type MealRow = {
  id: string;
  name: string;
  calories_per_serving: number;
  servings: number;
  meal_type: string;
};

export default async function MenuPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileResult, mealsResult] = await Promise.all([
    supabase
      .from("users")
      .select("daily_calorie_target")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("meals_log")
      .select("id, name, calories_per_serving, servings, meal_type")
      .eq("user_id", user.id)
      .gte("logged_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      .order("logged_at", { ascending: true }),
  ]);

  const target = profileResult.data?.daily_calorie_target ?? 2000;
  const meals: MealRow[] = (mealsResult.data ?? []).map((m) => ({
    ...m,
    servings: Number(m.servings),
  }));

  const totalConsumed = meals.reduce(
    (sum, m) => sum + Math.round(m.calories_per_serving * m.servings),
    0
  );
  const remaining = target - totalConsumed;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div style={pageStyle}>
      {/* Header row */}
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Today&apos;s Menu</h1>
          <p style={dateStyle}>{today}</p>
        </div>
        <div style={budgetPillStyle(remaining)}>
          {remaining >= 0
            ? `${remaining.toLocaleString()} kcal left`
            : `${Math.abs(remaining).toLocaleString()} kcal over`}
        </div>
      </div>

      {/* Meal slots */}
      {MEAL_SLOTS.map(({ type, label, emoji }) => {
        const slotMeals = meals.filter((m) => m.meal_type === type);
        const slotTotal = slotMeals.reduce(
          (sum, m) => sum + Math.round(m.calories_per_serving * m.servings),
          0
        );

        return (
          <div key={type} style={slotCardStyle}>
            <div style={slotHeaderStyle}>
              <div style={slotLabelGroupStyle}>
                <span style={slotEmojiStyle}>{emoji}</span>
                <span style={slotLabelStyle}>{label}</span>
              </div>
              <div style={slotRightStyle}>
                {slotTotal > 0 && (
                  <span style={slotTotalStyle}>{slotTotal.toLocaleString()} kcal</span>
                )}
                <Link href={`/log?type=${type}`} style={addButtonStyle}>
                  + Add
                </Link>
              </div>
            </div>

            {slotMeals.length === 0 ? (
              <p style={emptySlotStyle}>Nothing logged yet.</p>
            ) : (
              <ul style={mealListStyle}>
                {slotMeals.map((meal) => (
                  <li key={meal.id} style={mealRowStyle}>
                    <span style={mealNameStyle}>{meal.name}</span>
                    <span style={mealCalStyle}>
                      {Math.round(meal.calories_per_serving * meal.servings).toLocaleString()} kcal
                      {meal.servings !== 1 && (
                        <span style={mealServingsStyle}> ×{meal.servings}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      {/* Daily total */}
      <div style={totalRowStyle}>
        <span style={totalLabelStyle}>Total today</span>
        <span style={totalValueStyle}>{totalConsumed.toLocaleString()} / {target.toLocaleString()} kcal</span>
      </div>
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

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap",
  gap: "0.75rem",
  marginBottom: "0.25rem",
};

const titleStyle: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "var(--color-text-dark)",
  margin: 0,
};

const dateStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "var(--color-text-hover)",
  margin: "0.125rem 0 0",
};

const budgetPillStyle = (remaining: number): React.CSSProperties => ({
  padding: "0.375rem 0.875rem",
  borderRadius: "2rem",
  fontSize: "0.875rem",
  fontWeight: 700,
  background: remaining >= 0 ? "var(--color-header-bg)" : "#fddede",
  color: remaining >= 0 ? "var(--color-text-dark)" : "#c0392b",
  border: `1px solid ${remaining >= 0 ? "var(--color-border)" : "#f5c6c6"}`,
  whiteSpace: "nowrap",
});

const slotCardStyle: React.CSSProperties = {
  background: "var(--color-body-bg)",
  border: "1px solid var(--color-border)",
  borderRadius: "1rem",
  padding: "1rem 1.25rem",
  boxShadow: "0 2px 8px var(--color-shadow)",
  display: "flex",
  flexDirection: "column",
  gap: "0.625rem",
};

const slotHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const slotLabelGroupStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
};

const slotEmojiStyle: React.CSSProperties = {
  fontSize: "1.125rem",
  lineHeight: 1,
};

const slotLabelStyle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 700,
  color: "var(--color-text-dark)",
};

const slotRightStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
};

const slotTotalStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 600,
  color: "var(--color-text-hover)",
};

const addButtonStyle: React.CSSProperties = {
  padding: "0.3rem 0.75rem",
  borderRadius: "0.5rem",
  background: "var(--color-header-bg)",
  color: "var(--color-text-dark)",
  fontWeight: 700,
  fontSize: "0.8125rem",
  textDecoration: "none",
  border: "1px solid var(--color-border)",
};

const emptySlotStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "var(--color-text-hover)",
  margin: 0,
  fontStyle: "italic",
};

const mealListStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: "0.375rem",
};

const mealRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const mealNameStyle: React.CSSProperties = {
  fontSize: "0.9375rem",
  color: "var(--color-text-dark)",
  fontWeight: 500,
};

const mealCalStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 700,
  color: "var(--color-text-dark)",
};

const mealServingsStyle: React.CSSProperties = {
  fontWeight: 400,
  color: "var(--color-text-hover)",
};

const totalRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0.875rem 1.25rem",
  borderRadius: "0.75rem",
  background: "var(--color-header-bg)",
  border: "1px solid var(--color-border)",
};

const totalLabelStyle: React.CSSProperties = {
  fontSize: "0.9375rem",
  fontWeight: 700,
  color: "var(--color-text-dark)",
};

const totalValueStyle: React.CSSProperties = {
  fontSize: "0.9375rem",
  fontWeight: 700,
  color: "var(--color-text-dark)",
};
