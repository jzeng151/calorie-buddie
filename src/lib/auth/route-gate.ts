export type RouteDecision =
  | { type: "pass" }
  | { type: "redirect"; to: "/login" | "/onboarding" | "/" };

export function decideRoute(args: {
  pathname: string;
  userId: string | null;
  onboardingCompleted: boolean;
}): RouteDecision {
  const { pathname, userId, onboardingCompleted } = args;
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isOnboardingPage = pathname.startsWith("/onboarding");

  if (!userId) {
    return isAuthPage ? { type: "pass" } : { type: "redirect", to: "/login" };
  }
  if (isAuthPage) {
    return { type: "redirect", to: onboardingCompleted ? "/" : "/onboarding" };
  }
  if (!onboardingCompleted && !isOnboardingPage) {
    return { type: "redirect", to: "/onboarding" };
  }
  return { type: "pass" };
}
