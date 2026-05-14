import { describe, it, expect, beforeEach, vi } from "vitest";

describe("supabase browser client", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  it("createClient returns an object with auth and from APIs", async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const client = createClient();
    expect(client).toBeDefined();
    expect(typeof client.auth).toBe("object");
    expect(typeof client.from).toBe("function");
  });
});
