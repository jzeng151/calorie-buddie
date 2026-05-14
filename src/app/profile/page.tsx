"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const AVATARS = ["🥑", "🍎", "🥦", "🍊", "🍇", "🥕", "🍓", "🌽"];

type Profile = {
  username: string | null;
  avatar_url: string | null;
  daily_calorie_target: number;
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [calorieTarget, setCalorieTarget] = useState(2000);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      setEmail(user.email ?? null);
      const { data } = await supabase
        .from("users")
        .select("username, avatar_url, daily_calorie_target")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setProfile(data);
        setUsername(data.username ?? "");
        setAvatar(data.avatar_url ?? AVATARS[0]);
        setCalorieTarget(data.daily_calorie_target);
      }
    });
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { error: dbError } = await supabase.from("users").upsert({
      id: user.id,
      username: username.trim() || null,
      avatar_url: avatar,
      daily_calorie_target: calorieTarget,
      onboarding_completed: true,
    });

    if (dbError) {
      setError(dbError.message);
    } else {
      setSaved(true);
      router.refresh();
    }
    setSaving(false);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (!profile) {
    return <div style={pageStyle}><p style={loadingStyle}>Loading…</p></div>;
  }

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Profile & Settings</h1>
      {email && <p style={emailStyle}>{email}</p>}

      <form onSubmit={handleSave} style={formStyle}>
        {/* Avatar */}
        <label style={labelStyle}>Avatar</label>
        <div style={avatarGridStyle}>
          {AVATARS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setAvatar(emoji)}
              style={{
                ...avatarBtnStyle,
                background: avatar === emoji ? "var(--color-header-bg)" : "transparent",
                border: `2px solid ${avatar === emoji ? "var(--color-text-hover)" : "var(--color-border)"}`,
              }}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Username */}
        <label style={labelStyle}>Display name</label>
        <input
          type="text"
          placeholder="Your name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={inputStyle}
        />

        {/* Calorie target */}
        <label style={labelStyle}>Daily calorie target (kcal)</label>
        <div style={stepperRowStyle}>
          <button
            type="button"
            onClick={() => setCalorieTarget((v) => Math.max(500, v - 100))}
            style={stepperBtnStyle}
          >
            −
          </button>
          <input
            type="number"
            value={calorieTarget}
            onChange={(e) =>
              setCalorieTarget(Math.max(500, Math.min(10000, Number(e.target.value))))
            }
            min={500}
            max={10000}
            style={numberInputStyle}
          />
          <button
            type="button"
            onClick={() => setCalorieTarget((v) => Math.min(10000, v + 100))}
            style={stepperBtnStyle}
          >
            +
          </button>
        </div>

        {error && <p style={errorStyle}>{error}</p>}
        {saved && <p style={successStyle}>Saved!</p>}

        <button type="submit" disabled={saving} style={saveButtonStyle}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>

      <hr style={dividerStyle} />

      <button onClick={handleLogout} style={logoutButtonStyle}>
        Sign out
      </button>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: 480,
  margin: "0 auto",
  padding: "1.5rem 1rem 4rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
};

const loadingStyle: React.CSSProperties = {
  color: "var(--color-text-hover)",
};

const titleStyle: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "var(--color-text-dark)",
  margin: "0 0 0.125rem",
};

const emailStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "var(--color-text-hover)",
  margin: "0 0 1rem",
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
  marginTop: "0.875rem",
};

const avatarGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(8, 1fr)",
  gap: "0.5rem",
};

const avatarBtnStyle: React.CSSProperties = {
  padding: "0.5rem",
  borderRadius: "0.625rem",
  fontSize: "1.5rem",
  cursor: "pointer",
  lineHeight: 1,
  transition: "all 0.15s",
};

const inputStyle: React.CSSProperties = {
  padding: "0.75rem 1rem",
  borderRadius: "0.5rem",
  border: "1px solid var(--color-border)",
  background: "var(--color-body-bg)",
  color: "var(--color-text-dark)",
  fontSize: "1rem",
};

const stepperRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
};

const stepperBtnStyle: React.CSSProperties = {
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
  fontSize: "1.125rem",
  fontWeight: 700,
  textAlign: "center",
};

const errorStyle: React.CSSProperties = {
  color: "red",
  fontSize: "0.875rem",
};

const successStyle: React.CSSProperties = {
  color: "green",
  fontSize: "0.875rem",
  fontWeight: 600,
};

const saveButtonStyle: React.CSSProperties = {
  marginTop: "1rem",
  padding: "0.75rem",
  borderRadius: "0.625rem",
  background: "var(--color-header-bg)",
  color: "var(--color-text-dark)",
  fontWeight: 700,
  fontSize: "1rem",
  border: "none",
  cursor: "pointer",
};

const dividerStyle: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid var(--color-border)",
  margin: "1.5rem 0 1rem",
};

const logoutButtonStyle: React.CSSProperties = {
  padding: "0.75rem",
  borderRadius: "0.625rem",
  background: "transparent",
  color: "#c0392b",
  fontWeight: 600,
  fontSize: "1rem",
  border: "1px solid #f5c6c6",
  cursor: "pointer",
};
