import { describe, it, expect } from "vitest";
import { decideRoute } from "@/lib/auth/route-gate";

describe("decideRoute", () => {
  describe("unauthenticated", () => {
    it("redirects protected route to /login", () => {
      expect(
        decideRoute({ pathname: "/", userId: null, onboardingCompleted: false }),
      ).toEqual({ type: "redirect", to: "/login" });
    });

    it("passes through /login", () => {
      expect(
        decideRoute({ pathname: "/login", userId: null, onboardingCompleted: false }),
      ).toEqual({ type: "pass" });
    });

    it("passes through /signup", () => {
      expect(
        decideRoute({ pathname: "/signup", userId: null, onboardingCompleted: false }),
      ).toEqual({ type: "pass" });
    });
  });

  describe("authenticated, onboarding not complete", () => {
    it("redirects auth pages to /onboarding", () => {
      expect(
        decideRoute({ pathname: "/login", userId: "u1", onboardingCompleted: false }),
      ).toEqual({ type: "redirect", to: "/onboarding" });
    });

    it("redirects protected route to /onboarding", () => {
      expect(
        decideRoute({ pathname: "/", userId: "u1", onboardingCompleted: false }),
      ).toEqual({ type: "redirect", to: "/onboarding" });
    });

    it("passes through /onboarding itself", () => {
      expect(
        decideRoute({ pathname: "/onboarding", userId: "u1", onboardingCompleted: false }),
      ).toEqual({ type: "pass" });
    });
  });

  describe("authenticated, onboarding complete", () => {
    it("redirects /login to /", () => {
      expect(
        decideRoute({ pathname: "/login", userId: "u1", onboardingCompleted: true }),
      ).toEqual({ type: "redirect", to: "/" });
    });

    it("redirects /signup to /", () => {
      expect(
        decideRoute({ pathname: "/signup", userId: "u1", onboardingCompleted: true }),
      ).toEqual({ type: "redirect", to: "/" });
    });

    it("passes through /", () => {
      expect(
        decideRoute({ pathname: "/", userId: "u1", onboardingCompleted: true }),
      ).toEqual({ type: "pass" });
    });

    it("passes through deep app routes", () => {
      expect(
        decideRoute({ pathname: "/friends", userId: "u1", onboardingCompleted: true }),
      ).toEqual({ type: "pass" });
      expect(
        decideRoute({ pathname: "/log", userId: "u1", onboardingCompleted: true }),
      ).toEqual({ type: "pass" });
    });
  });
});
