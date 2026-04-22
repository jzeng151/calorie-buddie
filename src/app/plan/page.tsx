"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Recipe = {
  id: string;
  name: string;
  description: string | null;
  calories_per_serving: number;
  meal_type: string;
  emoji: string;
};

type SwipeDir = "left" | "right" | null;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function PlanPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [index, setIndex] = useState(0);
  const [swipeDir, setSwipeDir] = useState<SwipeDir>(null);
  const [showModal, setShowModal] = useState(false);
  const [servings, setServings] = useState(1);
  const [saving, setSaving] = useState(false);
  const [logged, setLogged] = useState<Recipe[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Drag tracking
  const dragStartX = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [recipesRes, profileRes, mealsRes] = await Promise.all([
        supabase.from("recipes").select("id, name, description, calories_per_serving, meal_type, emoji"),
        supabase.from("users").select("daily_calorie_target").eq("id", user.id).single(),
        supabase
          .from("meals_log")
          .select("calories_per_serving, servings")
          .eq("user_id", user.id)
          .gte("logged_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      ]);

      const target = profileRes.data?.daily_calorie_target ?? 2000;
      const consumed = (mealsRes.data ?? []).reduce(
        (sum, m) => sum + Math.round(m.calories_per_serving * m.servings),
        0
      );
      setRemaining(target - consumed);
      setRecipes(shuffle(recipesRes.data ?? []));
      setLoading(false);
    }
    load();
  }, []);

  const current = recipes[index] ?? null;
  const done = !loading && index >= recipes.length;

  function animateThen(dir: SwipeDir, cb: () => void) {
    setSwipeDir(dir);
    setTimeout(() => {
      setSwipeDir(null);
      cb();
    }, 320);
  }

  function handleSkip() {
    if (swipeDir || showModal) return;
    animateThen("left", () => setIndex((i) => i + 1));
  }

  function handleWant() {
    if (swipeDir || showModal) return;
    animateThen("right", () => {
      setServings(1);
      setShowModal(true);
    });
  }

  async function handleConfirm() {
    if (!current) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("meals_log").insert({
        user_id: user.id,
        name: current.name,
        calories_per_serving: current.calories_per_serving,
        servings,
        meal_type: current.meal_type,
      });
      const total = Math.round(current.calories_per_serving * servings);
      setRemaining((r) => (r !== null ? r - total : null));
      setLogged((prev) => [...prev, current]);
    }
    setSaving(false);
    setShowModal(false);
    setIndex((i) => i + 1);
  }

  // Drag/swipe handlers
  function onDragStart(clientX: number) {
    dragStartX.current = clientX;
  }
  function onDragEnd(clientX: number) {
    if (dragStartX.current === null) return;
    const delta = clientX - dragStartX.current;
    dragStartX.current = null;
    if (delta > 60) handleWant();
    else if (delta < -60) handleSkip();
  }

  const cardTransform =
    swipeDir === "left"
      ? "translateX(-120%) rotate(-15deg)"
      : swipeDir === "right"
      ? "translateX(120%) rotate(15deg)"
      : "translateX(0) rotate(0deg)";

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Help Me Decide!</h1>
        {remaining !== null && (
          <div style={budgetPillStyle(remaining)}>
            {remaining >= 0
              ? `${remaining.toLocaleString()} kcal left`
              : `${Math.abs(remaining).toLocaleString()} kcal over`}
          </div>
        )}
      </div>
      <p style={subtitleStyle}>Swipe right to log it, left to skip.</p>

      {loading && <div style={placeholderCardStyle} />}

      {!loading && done && (
        <div style={doneCardStyle}>
          <div style={{ fontSize: "3rem" }}>🎉</div>
          <p style={doneTextStyle}>
            {logged.length === 0
              ? "No meals added — nothing matched today?"
              : `${logged.length} meal${logged.length > 1 ? "s" : ""} logged!`}
          </p>
          <a href="/" style={homeLinkStyle}>Back to home</a>
        </div>
      )}

      {!loading && !done && current && (
        <div style={swipeAreaStyle}>
          {/* Next card peeking behind */}
          {recipes[index + 1] && (
            <div style={behindCardStyle}>
              <span style={{ fontSize: "3.5rem" }}>{recipes[index + 1].emoji}</span>
            </div>
          )}

          {/* Active card */}
          <div
            ref={cardRef}
            style={{ ...activeCardStyle, transform: cardTransform }}
            onMouseDown={(e) => onDragStart(e.clientX)}
            onMouseUp={(e) => onDragEnd(e.clientX)}
            onTouchStart={(e) => onDragStart(e.touches[0].clientX)}
            onTouchEnd={(e) => onDragEnd(e.changedTouches[0].clientX)}
          >
            <span style={cardEmojiStyle}>{current.emoji}</span>
            <p style={cardNameStyle}>{current.name}</p>
            {current.description && <p style={cardDescStyle}>{current.description}</p>}
            <div style={cardCalRowStyle}>
              <span style={cardCalStyle}>{current.calories_per_serving.toLocaleString()} kcal</span>
              <span style={cardTypeStyle}>{current.meal_type}</span>
            </div>
          </div>

          {/* Buttons */}
          <div style={buttonsStyle}>
            <button onClick={handleSkip} style={skipButtonStyle} aria-label="Skip">✕</button>
            <button onClick={handleWant} style={wantButtonStyle} aria-label="Log this">✓</button>
          </div>
        </div>
      )}

      {/* Logged today list */}
      {logged.length > 0 && (
        <div style={loggedCardStyle}>
          <p style={loggedTitleStyle}>Added today</p>
          <ul style={loggedListStyle}>
            {logged.map((r, i) => (
              <li key={i} style={loggedItemStyle}>
                <span>{r.emoji} {r.name}</span>
                <span style={{ color: "var(--color-text-hover)", fontSize: "0.875rem" }}>
                  {r.calories_per_serving.toLocaleString()} kcal
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Serving size bottom sheet */}
      {showModal && current && (
        <>
          <div style={backdropStyle} onClick={() => setShowModal(false)} />
          <div style={sheetStyle}>
            <p style={sheetTitleStyle}>How many servings?</p>
            <p style={sheetRecipeStyle}>{current.emoji} {current.name}</p>
            <div style={sheetStepperStyle}>
              <button
                onClick={() => setServings((v) => Math.max(0.5, parseFloat((v - 0.5).toFixed(1))))}
                style={stepperBtnStyle}
              >
                −
              </button>
              <span style={stepperValStyle}>{servings}</span>
              <button
                onClick={() => setServings((v) => parseFloat((v + 0.5).toFixed(1)))}
                style={stepperBtnStyle}
              >
                +
              </button>
            </div>
            <p style={sheetCalStyle}>
              {Math.round(current.calories_per_serving * servings).toLocaleString()} kcal total
            </p>
            <button onClick={handleConfirm} disabled={saving} style={confirmBtnStyle}>
              {saving ? "Logging..." : "Confirm"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  maxWidth: 480,
  margin: "0 auto",
  padding: "1.5rem 1rem 4rem",
  display: "flex",
  flexDirection: "column",
  gap: "1.25rem",
  position: "relative",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "0.5rem",
};

const titleStyle: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "var(--color-text-dark)",
  margin: 0,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "var(--color-text-hover)",
  margin: "-0.75rem 0 0",
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

const swipeAreaStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "1.5rem",
  position: "relative",
  minHeight: 340,
};

const sharedCardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 360,
  borderRadius: "1.25rem",
  padding: "2rem 1.5rem",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  gap: "0.625rem",
  border: "1px solid var(--color-border)",
  boxShadow: "0 4px 24px var(--color-shadow)",
};

const activeCardStyle: React.CSSProperties = {
  ...sharedCardStyle,
  background: "var(--color-body-bg)",
  cursor: "grab",
  userSelect: "none",
  transition: "transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
  position: "absolute",
  top: 0,
};

const behindCardStyle: React.CSSProperties = {
  ...sharedCardStyle,
  background: "var(--color-body-bg)",
  position: "absolute",
  top: 8,
  transform: "scale(0.96)",
  opacity: 0.6,
  justifyContent: "center",
};

const placeholderCardStyle: React.CSSProperties = {
  ...sharedCardStyle,
  background: "var(--color-border)",
  minHeight: 260,
  opacity: 0.4,
};

const cardEmojiStyle: React.CSSProperties = {
  fontSize: "4rem",
  lineHeight: 1,
};

const cardNameStyle: React.CSSProperties = {
  fontSize: "1.25rem",
  fontWeight: 700,
  color: "var(--color-text-dark)",
  margin: 0,
};

const cardDescStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "var(--color-text-hover)",
  margin: 0,
  lineHeight: 1.4,
};

const cardCalRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "0.75rem",
  alignItems: "center",
  marginTop: "0.25rem",
};

const cardCalStyle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 700,
  color: "var(--color-text-dark)",
};

const cardTypeStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "var(--color-text-hover)",
  background: "var(--color-header-bg)",
  borderRadius: "0.375rem",
  padding: "0.2rem 0.5rem",
  border: "1px solid var(--color-border)",
  fontWeight: 600,
};

const buttonsStyle: React.CSSProperties = {
  display: "flex",
  gap: "2.5rem",
  marginTop: 300,
};

const skipButtonStyle: React.CSSProperties = {
  width: 60,
  height: 60,
  borderRadius: "50%",
  border: "2px solid var(--color-border)",
  background: "var(--color-body-bg)",
  color: "#c0392b",
  fontSize: "1.375rem",
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 2px 8px var(--color-shadow)",
};

const wantButtonStyle: React.CSSProperties = {
  width: 60,
  height: 60,
  borderRadius: "50%",
  border: "2px solid var(--color-border)",
  background: "var(--color-header-bg)",
  color: "var(--color-text-dark)",
  fontSize: "1.375rem",
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 2px 8px var(--color-shadow)",
};

const doneCardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "0.75rem",
  padding: "2.5rem 1.5rem",
  borderRadius: "1.25rem",
  border: "1px solid var(--color-border)",
  background: "var(--color-body-bg)",
  boxShadow: "0 4px 24px var(--color-shadow)",
  textAlign: "center",
};

const doneTextStyle: React.CSSProperties = {
  fontSize: "1rem",
  color: "var(--color-text-dark)",
  margin: 0,
  fontWeight: 600,
};

const homeLinkStyle: React.CSSProperties = {
  padding: "0.625rem 1.5rem",
  borderRadius: "0.625rem",
  background: "var(--color-header-bg)",
  color: "var(--color-text-dark)",
  fontWeight: 700,
  fontSize: "0.9375rem",
  textDecoration: "none",
  marginTop: "0.5rem",
};

const loggedCardStyle: React.CSSProperties = {
  border: "1px solid var(--color-border)",
  borderRadius: "1rem",
  padding: "1rem 1.25rem",
  background: "var(--color-body-bg)",
  boxShadow: "0 2px 8px var(--color-shadow)",
};

const loggedTitleStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--color-text-hover)",
  margin: "0 0 0.625rem",
};

const loggedListStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
};

const loggedItemStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "0.9375rem",
  fontWeight: 600,
  color: "var(--color-text-dark)",
};

const backdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  zIndex: 10,
};

const sheetStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  background: "var(--color-body-bg)",
  borderRadius: "1.5rem 1.5rem 0 0",
  padding: "2rem 2rem 2.5rem",
  zIndex: 11,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "0.875rem",
  boxShadow: "0 -4px 24px var(--color-shadow)",
  maxWidth: 480,
  margin: "0 auto",
};

const sheetTitleStyle: React.CSSProperties = {
  fontSize: "1.25rem",
  fontWeight: 700,
  color: "var(--color-text-dark)",
  margin: 0,
};

const sheetRecipeStyle: React.CSSProperties = {
  fontSize: "1rem",
  color: "var(--color-text-hover)",
  margin: 0,
};

const sheetStepperStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "1.5rem",
  margin: "0.5rem 0",
};

const stepperBtnStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: "50%",
  border: "1px solid var(--color-border)",
  background: "transparent",
  color: "var(--color-text-dark)",
  fontSize: "1.5rem",
  fontWeight: 700,
  cursor: "pointer",
};

const stepperValStyle: React.CSSProperties = {
  fontSize: "2rem",
  fontWeight: 700,
  color: "var(--color-text-dark)",
  minWidth: 40,
  textAlign: "center",
};

const sheetCalStyle: React.CSSProperties = {
  fontSize: "0.9375rem",
  color: "var(--color-text-hover)",
  margin: 0,
  fontWeight: 600,
};

const confirmBtnStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 320,
  padding: "0.875rem",
  borderRadius: "0.75rem",
  background: "var(--color-header-bg)",
  color: "var(--color-text-dark)",
  fontWeight: 700,
  fontSize: "1rem",
  border: "none",
  cursor: "pointer",
  marginTop: "0.25rem",
};
