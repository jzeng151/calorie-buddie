import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const CIRCUMFERENCE = 2 * Math.PI * 54;

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

function CalorieRing({ pct }: { pct: number }) {
  const clamped = Math.min(pct, 100);
  const offset = CIRCUMFERENCE * (1 - clamped / 100);
  const color = pct >= 100 ? "#c0392b" : "var(--color-text-hover)";

  return (
    <svg width={140} height={140} viewBox="0 0 120 120">
      <circle cx={60} cy={60} r={54} fill="none" stroke="var(--color-border)" strokeWidth={10} />
      <circle
        cx={60}
        cy={60}
        r={54}
        fill="none"
        stroke={color}
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        transform="rotate(-90 60 60)"
      />
      <text x={60} y={56} textAnchor="middle" fill="var(--color-text-dark)" fontSize={20} fontWeight={700}>
        {pct}%
      </text>
      <text x={60} y={72} textAnchor="middle" fill="var(--color-text-hover)" fontSize={10}>
        used
      </text>
    </svg>
  );
}

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileResult, mealsResult] = await Promise.all([
    supabase
      .from("users")
      .select("username, avatar_url, daily_calorie_target")
      .eq("id", user.id)
      .single(),
    supabase
      .from("meals_log")
      .select("id, name, calories_per_serving, servings, meal_type, logged_at")
      .eq("user_id", user.id)
      .gte("logged_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      .order("logged_at", { ascending: true }),
  ]);

  const profile = profileResult.data;
  const meals = mealsResult.data ?? [];

  const target = profile?.daily_calorie_target ?? 2000;
  const consumed = meals.reduce(
    (sum, m) => sum + Math.round(m.calories_per_serving * m.servings),
    0
  );
  const remaining = target - consumed;
  const pct = Math.min(999, Math.round((consumed / target) * 100));

  const greeting = profile?.username ? `Hey, ${profile.username}!` : "Hey there!";
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div style={pageStyle}>
      {/* Greeting */}
      <div style={greetingRowStyle}>
        {profile?.avatar_url && <span style={avatarStyle}>{profile.avatar_url}</span>}
        <div>
          <h1 style={greetingStyle}>{greeting}</h1>
          <p style={dateStyle}>{today}</p>
        </div>
      </div>

      {/* Calorie card */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Today&apos;s Budget</h2>
        <div style={ringRowStyle}>
          <CalorieRing pct={pct} />
          <div style={statsStyle}>
            <StatItem label="Target" value={target} />
            <StatItem label="Consumed" value={consumed} />
            <StatItem label="Remaining" value={remaining} highlight={remaining >= 0} warn={remaining < 0} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={actionsStyle}>
        <Link href="/log" style={primaryActionStyle}>+ Log a Meal</Link>
        <Link href="/suggest" style={secondaryActionStyle}>Help Me Decide!</Link>
      </div>

      {/* Meals list */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Meals Today</h2>
        {meals.length === 0 ? (
          <p style={emptyStyle}>No meals logged yet. Tap &quot;Log a Meal&quot; to get started.</p>
        ) : (
          <ul style={mealListStyle}>
            {meals.map((meal) => (
              <li key={meal.id} style={mealItemStyle}>
                <div>
                  <span style={mealNameStyle}>{meal.name}</span>
                  <span style={mealTypeStyle}>{MEAL_TYPE_LABELS[meal.meal_type]}</span>
                </div>
                <span style={mealCalStyle}>
                  {Math.round(meal.calories_per_serving * meal.servings).toLocaleString()} kcal
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatItem({
  label,
  value,
  highlight,
  warn,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  warn?: boolean;
}) {
  const color = warn ? "#c0392b" : highlight ? "var(--color-text-hover)" : "var(--color-text-dark)";
  return (
    <div style={statItemStyle}>
      <span style={statLabelStyle}>{label}</span>
      <span style={{ ...statValueStyle, color }}>
        {value.toLocaleString()}
        <span style={statUnitStyle}> kcal</span>
      </span>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: 600,
  margin: "0 auto",
  padding: "1.5rem 1rem 4rem",
  display: "flex",
  flexDirection: "column",
  gap: "1.25rem",
};

const greetingRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.875rem",
};

const avatarStyle: React.CSSProperties = {
  fontSize: "2.5rem",
  lineHeight: 1,
};

const greetingStyle: React.CSSProperties = {
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

const cardStyle: React.CSSProperties = {
  background: "var(--color-body-bg)",
  border: "1px solid var(--color-border)",
  borderRadius: "1rem",
  padding: "1.25rem 1.5rem",
  boxShadow: "0 2px 12px var(--color-shadow)",
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: "0.8125rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--color-text-hover)",
  margin: "0 0 1rem",
};

const ringRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "2rem",
};

const statsStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
  flex: 1,
};

const statItemStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.125rem",
};

const statLabelStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "var(--color-text-hover)",
};

const statValueStyle: React.CSSProperties = {
  fontSize: "1.0625rem",
  fontWeight: 700,
};

const statUnitStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 400,
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "0.75rem",
};

const primaryActionStyle: React.CSSProperties = {
  flex: 1,
  padding: "0.875rem 1rem",
  borderRadius: "0.75rem",
  background: "var(--color-header-bg)",
  color: "var(--color-text-dark)",
  fontWeight: 700,
  fontSize: "0.9375rem",
  textAlign: "center",
  textDecoration: "none",
  boxShadow: "0 2px 8px var(--color-shadow)",
};

const secondaryActionStyle: React.CSSProperties = {
  flex: 1,
  padding: "0.875rem 1rem",
  borderRadius: "0.75rem",
  background: "transparent",
  color: "var(--color-text-hover)",
  fontWeight: 600,
  fontSize: "0.9375rem",
  textAlign: "center",
  textDecoration: "none",
  border: "1px solid var(--color-border)",
};

const mealListStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
};

const mealItemStyle: React.CSSProperties = {
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

const mealTypeStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "var(--color-text-hover)",
  display: "block",
};

const mealCalStyle: React.CSSProperties = {
  fontSize: "0.9375rem",
  fontWeight: 700,
  color: "var(--color-text-dark)",
};

const emptyStyle: React.CSSProperties = {
  fontSize: "0.9375rem",
  color: "var(--color-text-hover)",
  margin: 0,
  lineHeight: 1.5,
};
