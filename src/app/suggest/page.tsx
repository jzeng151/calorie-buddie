import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const MEAL_TYPE_ORDER = ["breakfast", "lunch", "dinner", "snack"] as const;
const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

type Recipe = {
  id: string;
  name: string;
  description: string | null;
  calories_per_serving: number;
  meal_type: string;
  emoji: string;
};

export default async function SuggestPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileResult, mealsResult, recipesResult] = await Promise.all([
    supabase
      .from("users")
      .select("daily_calorie_target")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("meals_log")
      .select("calories_per_serving, servings")
      .eq("user_id", user.id)
      .gte("logged_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    supabase
      .from("recipes")
      .select("id, name, description, calories_per_serving, meal_type, emoji")
      .order("calories_per_serving", { ascending: true }),
  ]);

  const target = profileResult.data?.daily_calorie_target ?? 2000;
  const meals = mealsResult.data ?? [];
  const recipes: Recipe[] = recipesResult.data ?? [];

  const consumed = meals.reduce(
    (sum, m) => sum + Math.round(m.calories_per_serving * m.servings),
    0
  );
  const remaining = target - consumed;

  const grouped = MEAL_TYPE_ORDER.reduce<Record<string, Recipe[]>>((acc, type) => {
    acc[type] = recipes.filter((r) => r.meal_type === type);
    return acc;
  }, {} as Record<string, Recipe[]>);

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Help Me Decide!</h1>
        <div style={budgetPillStyle(remaining)}>
          {remaining >= 0
            ? `${remaining.toLocaleString()} kcal left today`
            : `${Math.abs(remaining).toLocaleString()} kcal over budget`}
        </div>
      </div>

      {MEAL_TYPE_ORDER.map((type) => (
        <section key={type}>
          <h2 style={sectionTitleStyle}>{MEAL_TYPE_LABELS[type]}</h2>
          <div style={gridStyle}>
            {grouped[type].map((recipe) => {
              const fits = recipe.calories_per_serving <= remaining;
              return (
                <RecipeCard key={recipe.id} recipe={recipe} fits={fits} remaining={remaining} />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function RecipeCard({
  recipe,
  fits,
  remaining,
}: {
  recipe: Recipe;
  fits: boolean;
  remaining: number;
}) {
  const logUrl = `/log?name=${encodeURIComponent(recipe.name)}&calories=${recipe.calories_per_serving}&type=${recipe.meal_type}`;

  return (
    <div style={cardStyle(fits)}>
      <div style={cardTopStyle}>
        <span style={emojiStyle}>{recipe.emoji}</span>
        {!fits && remaining > 0 && (
          <span style={overBudgetBadgeStyle}>
            +{(recipe.calories_per_serving - remaining).toLocaleString()} kcal over
          </span>
        )}
        {remaining <= 0 && <span style={overBudgetBadgeStyle}>Over budget</span>}
      </div>
      <p style={recipeNameStyle}>{recipe.name}</p>
      {recipe.description && <p style={descStyle}>{recipe.description}</p>}
      <div style={cardFooterStyle}>
        <span style={calStyle}>{recipe.calories_per_serving.toLocaleString()} kcal</span>
        <Link href={logUrl} style={logButtonStyle}>
          Log this
        </Link>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: 680,
  margin: "0 auto",
  padding: "1.5rem 1rem 4rem",
  display: "flex",
  flexDirection: "column",
  gap: "1.5rem",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "0.75rem",
};

const titleStyle: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "var(--color-text-dark)",
  margin: 0,
};

const budgetPillStyle = (remaining: number): React.CSSProperties => ({
  padding: "0.375rem 0.875rem",
  borderRadius: "2rem",
  fontSize: "0.875rem",
  fontWeight: 700,
  background: remaining >= 0 ? "var(--color-header-bg)" : "#fddede",
  color: remaining >= 0 ? "var(--color-text-dark)" : "#c0392b",
  border: `1px solid ${remaining >= 0 ? "var(--color-border)" : "#f5c6c6"}`,
});

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "0.8125rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--color-text-hover)",
  margin: "0 0 0.75rem",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: "0.75rem",
};

const cardStyle = (fits: boolean): React.CSSProperties => ({
  background: "var(--color-body-bg)",
  border: `1px solid ${fits ? "var(--color-border)" : "var(--color-border)"}`,
  borderRadius: "0.875rem",
  padding: "1rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.375rem",
  boxShadow: "0 2px 8px var(--color-shadow)",
  opacity: fits ? 1 : 0.6,
});

const cardTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
};

const emojiStyle: React.CSSProperties = {
  fontSize: "2rem",
  lineHeight: 1,
};

const overBudgetBadgeStyle: React.CSSProperties = {
  fontSize: "0.6875rem",
  fontWeight: 700,
  color: "#c0392b",
  background: "#fddede",
  borderRadius: "0.375rem",
  padding: "0.2rem 0.4rem",
};

const recipeNameStyle: React.CSSProperties = {
  fontSize: "0.9375rem",
  fontWeight: 700,
  color: "var(--color-text-dark)",
  margin: "0.25rem 0 0",
};

const descStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "var(--color-text-hover)",
  margin: 0,
  lineHeight: 1.4,
  flexGrow: 1,
};

const cardFooterStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: "0.5rem",
};

const calStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 700,
  color: "var(--color-text-dark)",
};

const logButtonStyle: React.CSSProperties = {
  padding: "0.375rem 0.75rem",
  borderRadius: "0.5rem",
  background: "var(--color-header-bg)",
  color: "var(--color-text-dark)",
  fontWeight: 700,
  fontSize: "0.8125rem",
  textDecoration: "none",
  border: "none",
};
