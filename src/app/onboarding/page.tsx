"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const AVATARS = ["🥑", "🍎", "🥦", "🍊", "🍇", "🥕", "🍓", "🌽"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [calorieTarget, setCalorieTarget] = useState(2000);
  const [username, setUsername] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.onboarding_completed) {
        router.replace("/");
      }
    });
  }, [router]);

  async function handleComplete() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { error: dbError } = await supabase.from("users").upsert({
      id: user.id,
      username: username.trim() || null,
      avatar_url: selectedAvatar,
      daily_calorie_target: calorieTarget,
      onboarding_completed: true,
    });

    if (dbError) {
      setError(dbError.message);
      setLoading(false);
      return;
    }

    await supabase.auth.updateUser({ data: { onboarding_completed: true } });

    router.push("/");
    router.refresh();
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={stepsStyle}>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              style={{
                ...dotStyle,
                background: s <= step ? "var(--color-text-hover)" : "var(--color-border)",
              }}
            />
          ))}
        </div>

        {step === 1 && (
          <div style={stepContentStyle}>
            <div style={emojiStyle}>🥗</div>
            <h1 style={titleStyle}>Welcome to Calorie Buddie!</h1>
            <p style={subtitleStyle}>
              Track your meals, hit your goals, and feel great — one day at a time.
            </p>
            <button onClick={() => setStep(2)} style={primaryButtonStyle}>
              Get Started
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={stepContentStyle}>
            <div style={emojiStyle}>🎯</div>
            <h1 style={titleStyle}>Set your daily calorie goal</h1>
            <p style={subtitleStyle}>
              We&apos;ll use this to personalise your plan. You can change it any time in Settings.
            </p>
            <div style={stepperRowStyle}>
              <button
                onClick={() => setCalorieTarget((v) => Math.max(500, v - 100))}
                style={stepperButtonStyle}
              >
                −
              </button>
              <input
                type="number"
                value={calorieTarget}
                onChange={(e) => setCalorieTarget(Math.max(500, Math.min(10000, Number(e.target.value))))}
                style={numberInputStyle}
                min={500}
                max={10000}
              />
              <span style={{ color: "var(--color-text-hover)", fontWeight: 600 }}>kcal</span>
              <button
                onClick={() => setCalorieTarget((v) => Math.min(10000, v + 100))}
                style={stepperButtonStyle}
              >
                +
              </button>
            </div>
            <div style={navRowStyle}>
              <button onClick={() => setStep(1)} style={secondaryButtonStyle}>Back</button>
              <button onClick={() => setStep(3)} style={primaryButtonStyle}>Continue</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={stepContentStyle}>
            <div style={emojiStyle}>👤</div>
            <h1 style={titleStyle}>Create your profile</h1>
            <p style={subtitleStyle}>Pick an avatar and set your display name.</p>
            <div style={avatarGridStyle}>
              {AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setSelectedAvatar(emoji)}
                  style={{
                    ...avatarButtonStyle,
                    background: selectedAvatar === emoji ? "var(--color-header-bg)" : "transparent",
                    border: `2px solid ${selectedAvatar === emoji ? "var(--color-text-hover)" : "var(--color-border)"}`,
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Your name (optional)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ ...inputStyle, marginBottom: "1.5rem" }}
            />
            {error && (
              <p style={{ color: "red", fontSize: "0.875rem", marginBottom: "1rem" }}>{error}</p>
            )}
            <div style={navRowStyle}>
              <button onClick={() => setStep(2)} style={secondaryButtonStyle}>Back</button>
              <button onClick={handleComplete} disabled={loading} style={primaryButtonStyle}>
                {loading ? "Setting up..." : "Let's go!"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "80vh",
  padding: "2rem",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 480,
  padding: "2.5rem",
  borderRadius: "1.5rem",
  border: "1px solid var(--color-border)",
  boxShadow: "0 4px 24px var(--color-shadow)",
};

const stepsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: "0.5rem",
  marginBottom: "2.5rem",
};

const dotStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  transition: "background 0.25s",
};

const stepContentStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
};

const emojiStyle: React.CSSProperties = {
  fontSize: "3.5rem",
  marginBottom: "1rem",
};

const titleStyle: React.CSSProperties = {
  fontSize: "1.625rem",
  fontWeight: 700,
  color: "var(--color-text-dark)",
  marginBottom: "0.75rem",
};

const subtitleStyle: React.CSSProperties = {
  fontSize: "0.9375rem",
  color: "var(--color-text-hover)",
  marginBottom: "2rem",
  lineHeight: 1.6,
  maxWidth: 340,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "0.75rem 2rem",
  borderRadius: "0.625rem",
  background: "var(--color-header-bg)",
  color: "var(--color-text-dark)",
  fontWeight: 700,
  fontSize: "1rem",
  border: "none",
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "0.75rem 2rem",
  borderRadius: "0.625rem",
  background: "transparent",
  color: "var(--color-text-hover)",
  fontWeight: 600,
  fontSize: "1rem",
  border: "1px solid var(--color-border)",
  cursor: "pointer",
};

const navRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "0.75rem",
  justifyContent: "center",
};

const stepperRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  marginBottom: "2rem",
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

const numberInputStyle: React.CSSProperties = {
  width: 110,
  padding: "0.625rem 0.75rem",
  borderRadius: "0.5rem",
  border: "1px solid var(--color-border)",
  background: "var(--color-body-bg)",
  color: "var(--color-text-dark)",
  fontSize: "1.25rem",
  fontWeight: 700,
  textAlign: "center",
};

const avatarGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "0.75rem",
  marginBottom: "1.5rem",
};

const avatarButtonStyle: React.CSSProperties = {
  padding: "0.75rem",
  borderRadius: "0.75rem",
  fontSize: "1.75rem",
  cursor: "pointer",
  transition: "all 0.15s",
  lineHeight: 1,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem 1rem",
  borderRadius: "0.5rem",
  border: "1px solid var(--color-border)",
  background: "var(--color-body-bg)",
  color: "var(--color-text-dark)",
  fontSize: "1rem",
  boxSizing: "border-box",
};
