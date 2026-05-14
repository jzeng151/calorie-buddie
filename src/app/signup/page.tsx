"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // If email confirmation is enabled, signUp returns no session. Routing
    // to /onboarding would bounce off the proxy (userId is null) back to
    // /login — show a pending-verification state instead.
    if (!data.session) {
      setAwaitingConfirmation(true);
      setLoading(false);
      return;
    }

    router.push("/onboarding");
    router.refresh();
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
      <div style={{ width: "100%", maxWidth: 400, padding: "2rem" }}>
        <h1 style={{ marginBottom: "1.5rem", color: "var(--color-text-dark)" }}>Create account</h1>
        {awaitingConfirmation ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <p style={{ color: "var(--color-text-dark)" }}>
              Check your email — we sent a confirmation link to <strong>{email}</strong>.
              Click it to finish creating your account, then sign in.
            </p>
            <Link href="/login" style={{ color: "var(--color-text-hover)" }}>
              Back to sign in
            </Link>
          </div>
        ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={inputStyle}
          />
          {error && <p style={{ color: "red", fontSize: "0.875rem" }}>{error}</p>}
          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
        )}
        {!awaitingConfirmation && (
          <p style={{ marginTop: "1rem", textAlign: "center", color: "var(--color-text-dark)" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--color-text-hover)" }}>
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "0.75rem 1rem",
  borderRadius: "0.5rem",
  border: "1px solid var(--color-border)",
  background: "var(--color-body-bg)",
  color: "var(--color-text-dark)",
  fontSize: "1rem",
};

const buttonStyle: React.CSSProperties = {
  padding: "0.75rem 1rem",
  borderRadius: "0.5rem",
  background: "var(--color-header-bg)",
  color: "var(--color-text-dark)",
  fontWeight: 600,
  fontSize: "1rem",
  border: "none",
  cursor: "pointer",
};
