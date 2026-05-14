import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
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

type Props = {
  searchParams: Promise<{ type?: string }>;
};

export default async function RecipesPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { type: activeType } = await searchParams;

  const query = supabase
    .from("recipes")
    .select("id, name, description, calories_per_serving, meal_type, emoji")
    .order("calories_per_serving", { ascending: true });

  if (activeType && MEAL_TYPES.includes(activeType as (typeof MEAL_TYPES)[number])) {
    query.eq("meal_type", activeType);
  }

  const { data } = await query;
  const recipes: Recipe[] = data ?? [];

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Recipes</h1>

      {/* Filter tabs */}
      <div style={tabsStyle}>
        <FilterTab label="All" href="/recipes" active={!activeType} />
        {MEAL_TYPES.map((type) => (
          <FilterTab
            key={type}
            label={MEAL_TYPE_LABELS[type]}
            href={`/recipes?type=${type}`}
            active={activeType === type}
          />
        ))}
      </div>

      {recipes.length === 0 ? (
        <p style={emptyStyle}>No recipes found.</p>
      ) : (
        <div style={gridStyle}>
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterTab({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        ...tabStyle,
        background: active ? "var(--color-header-bg)" : "transparent",
        fontWeight: active ? 700 : 500,
        border: `1px solid ${active ? "var(--color-text-hover)" : "var(--color-border)"}`,
      }}
    >
      {label}
    </Link>
  );
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const logUrl = `/log?name=${encodeURIComponent(recipe.name)}&calories=${recipe.calories_per_serving}&type=${recipe.meal_type}`;

  return (
    <div style={cardStyle}>
      <div style={cardTopStyle}>
        <span style={emojiStyle}>{recipe.emoji}</span>
        <span style={mealTypeBadgeStyle}>{MEAL_TYPE_LABELS[recipe.meal_type]}</span>
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
  maxWidth: 720,
  margin: "0 auto",
  padding: "1.5rem 1rem 4rem",
  display: "flex",
  flexDirection: "column",
  gap: "1.25rem",
};

const titleStyle: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "var(--color-text-dark)",
  margin: 0,
};

const tabsStyle: React.CSSProperties = {
  display: "flex",
  gap: "0.5rem",
  flexWrap: "wrap",
};

const tabStyle: React.CSSProperties = {
  padding: "0.4rem 0.875rem",
  borderRadius: "2rem",
  fontSize: "0.875rem",
  textDecoration: "none",
  color: "var(--color-text-dark)",
  transition: "all 0.15s",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
  gap: "0.875rem",
};

const cardStyle: React.CSSProperties = {
  background: "var(--color-body-bg)",
  border: "1px solid var(--color-border)",
  borderRadius: "0.875rem",
  padding: "1rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.375rem",
  boxShadow: "0 2px 8px var(--color-shadow)",
};

const cardTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
};

const emojiStyle: React.CSSProperties = {
  fontSize: "2rem",
  lineHeight: 1,
};

const mealTypeBadgeStyle: React.CSSProperties = {
  fontSize: "0.6875rem",
  fontWeight: 700,
  color: "var(--color-text-hover)",
  background: "var(--color-header-bg)",
  borderRadius: "0.375rem",
  padding: "0.2rem 0.5rem",
  border: "1px solid var(--color-border)",
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
};

const emptyStyle: React.CSSProperties = {
  fontSize: "0.9375rem",
  color: "var(--color-text-hover)",
};
