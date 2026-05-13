import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { decideRoute } from "@/lib/auth/route-gate";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Source of truth: public.users.onboarding_completed (RLS-locked, server-only).
  // Never trust user_metadata — it is user-writable from the browser.
  let onboardingCompleted = false;
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();
    onboardingCompleted = profile?.onboarding_completed ?? false;
  }

  const decision = decideRoute({
    pathname: request.nextUrl.pathname,
    userId: user?.id ?? null,
    onboardingCompleted,
  });

  if (decision.type === "redirect") {
    return NextResponse.redirect(new URL(decision.to, request.url));
  }
  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
