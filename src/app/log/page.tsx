"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  MEAL_TYPES,
  type MealType,
  isValidMealType,
  parsePrefillCalories,
  parsePrefillName,
} from "@/lib/log/prefill";

export default function LogPage() {
  return (
    <Suspense>
      <LogForm />
    </Suspense>
  );
}

function LogForm() {
  const router = useRouter();
  const params = useSearchParams();

  const prefillName = parsePrefillName(params.get("name"));
  const prefillCal = parsePrefillCalories(params.get("calories"));
  const prefillType = params.get("type");

  const [name, setName] = useState(prefillName);
  const [caloriesPerServing, setCaloriesPerServing] = useState<number | "">(prefillCal);
  const [servings, setServings] = useState(1);
  const [mealType, setMealType] = useState<MealType>(isValidMealType(prefillType) ? prefillType : "snack");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total =
    caloriesPerServing !== "" ? Math.round(Number(caloriesPerServing) * servings) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || caloriesPerServing === "" || Number(caloriesPerServing) <= 0) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { error: dbError } = await supabase.from("meals_log").insert({
      user_id: user.id,
      name: name.trim(),
      calories_per_serving: Number(caloriesPerServing),
      servings,
      meal_type: mealType,
    });

    if (dbError) {
      setError(dbError.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Log a Meal</h1>

        <form onSubmit={handleSubmit} style={formStyle}>
          {/* Meal name */}
          <label style={labelStyle}>Meal name</label>
          <input
            type="text"
            placeholder="e.g. Chicken salad"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={inputStyle}
          />

          {/* Meal type */}
          <label style={labelStyle}>Meal type</label>
          <div style={segmentStyle}>
            {MEAL_TYPES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMealType(value)}
                style={{
                  ...segmentButtonStyle,
                  background:
                    mealType === value ? "var(--color-header-bg)" : "transparent",
                  fontWeight: mealType === value ? 700 : 400,
                  border: `1px solid ${mealType === value ? "var(--color-text-hover)" : "var(--color-border)"}`,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Calories per serving */}
          <label style={labelStyle}>Calories per serving (kcal)</label>
          <input
            type="number"
            placeholder="e.g. 350"
            value={caloriesPerServing}
            onChange={(e) =>
              setCaloriesPerServing(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))
            }
            required
            min={1}
            style={inputStyle}
          />

          {/* Servings stepper */}
          <label style={labelStyle}>Servings</label>
          <div style={stepperRowStyle}>
            <button
              type="button"
              onClick={() => setServings((v) => Math.max(0.5, parseFloat((v - 0.5).toFixed(1))))}
              style={stepperButtonStyle}
            >
              −
            </button>
            <span style={servingsValueStyle}>{servings}</span>
            <button
              type="button"
              onClick={() => setServings((v) => parseFloat((v + 0.5).toFixed(1)))}
              style={stepperButtonStyle}
            >
              +
            </button>
          </div>

          {/* Running total */}
          <div style={totalRowStyle}>
            <span style={totalLabelStyle}>Total</span>
            <span style={totalValueStyle}>{total.toLocaleString()} kcal</span>
          </div>

          {error && <p style={errorStyle}>{error}</p>}

          <div style={navRowStyle}>
            <button type="button" onClick={() => router.back()} style={secondaryButtonStyle}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={primaryButtonStyle}>
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  padding: "1.5rem 1rem",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 480,
  padding: "2rem",
  borderRadius: "1rem",
  border: "1px solid var(--color-border)",
  boxShadow: "0 2px 12px var(--color-shadow)",
};

const titleStyle: React.CSSProperties = {
  fontSize: "1.375rem",
  fontWeight: 700,
  color: "var(--color-text-dark)",
  marginBottom: "1.5rem",
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.8125rem",
  fontWeight: 600,
  color: "var(--color-text-hover)",
  marginTop: "0.75rem",
};

const inputStyle: React.CSSProperties = {
  padding: "0.75rem 1rem",
  borderRadius: "0.5rem",
  border: "1px solid var(--color-border)",
  background: "var(--color-body-bg)",
  color: "var(--color-text-dark)",
  fontSize: "1rem",
};

const segmentStyle: React.CSSProperties = {
  display: "flex",
  gap: "0.5rem",
  flexWrap: "wrap",
};

const segmentButtonStyle: React.CSSProperties = {
  padding: "0.5rem 0.875rem",
  borderRadius: "0.5rem",
  fontSize: "0.875rem",
  cursor: "pointer",
  color: "var(--color-text-dark)",
  transition: "all 0.15s",
};

const stepperRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "1rem",
};

const stepperButtonStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: "50%",
  border: "1px solid var(--color-border)",
  background: "transparent",
  color: "var(--color-text-dark)",
  fontSize: "1.25rem",
  fontWeight: 700,
  cursor: "pointer",
};

const servingsValueStyle: React.CSSProperties = {
  fontSize: "1.25rem",
  fontWeight: 700,
  color: "var(--color-text-dark)",
  minWidth: 32,
  textAlign: "center",
};

const totalRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: "1.25rem",
  padding: "0.875rem 1rem",
  borderRadius: "0.625rem",
  background: "var(--color-header-bg)",
};

const totalLabelStyle: React.CSSProperties = {
  fontSize: "0.9375rem",
  fontWeight: 600,
  color: "var(--color-text-dark)",
};

const totalValueStyle: React.CSSProperties = {
  fontSize: "1.125rem",
  fontWeight: 700,
  color: "var(--color-text-dark)",
};

const errorStyle: React.CSSProperties = {
  color: "red",
  fontSize: "0.875rem",
};

const navRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "0.75rem",
  marginTop: "1.5rem",
};

const primaryButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: "0.75rem",
  borderRadius: "0.625rem",
  background: "var(--color-header-bg)",
  color: "var(--color-text-dark)",
  fontWeight: 700,
  fontSize: "1rem",
  border: "none",
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: "0.75rem",
  borderRadius: "0.625rem",
  background: "transparent",
  color: "var(--color-text-hover)",
  fontWeight: 600,
  fontSize: "1rem",
  border: "1px solid var(--color-border)",
  cursor: "pointer",
};
