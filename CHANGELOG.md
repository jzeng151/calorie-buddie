# Changelog

All notable changes to Calorie Buddie are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions use
MAJOR.MINOR.PATCH.MICRO.

## [0.1.0.1] - 2026-05-13

Design system foundation and Buddy feature database layer. No new user-facing
features — this is the groundwork the Buddy build sits on top of.

### Added
- `DESIGN.md` — canonical design system spec (Fraunces serif, Instrument Sans
  body, Geist Mono numerics, warm earth palette with coral `#e85d4f` accent,
  buddy-voice italic, hierarchical radius, 8px spacing base, dark mode tokens).
- Supabase migration `20260513000000_buddy_feature.sql` — `buddy_state` and
  `hydration_logs` tables plus 4 RPCs for the Buddy feature.
- `globals.css` canonical design tokens with light/dark palettes and motion +
  typography scales.
- Fraunces, Instrument Sans, and Geist Mono via `next/font` in the root layout.

### Changed
- `CLAUDE.md` — added Design System guardrails section pointing at DESIGN.md.
- `TODOS.md` — Buddy section updated with design-review outcomes; Day-0 token
  migration marked done.

## [0.1.0.0] - 2026-05-12

First end-to-end MVP. You can sign up, set a daily calorie target, log
meals, browse recipes, swipe through "Help Me Decide!", review history,
and follow friends' daily progress.

### Added
- Authentication and onboarding flow: signup, login, 3-step onboarding
  (welcome → calorie target → username + avatar).
- Home dashboard with today's calorie ring, remaining-budget pill, and
  recent-meal list.
- Log Meal page with manual entry, query-string prefill (from /suggest
  and /plan), and serving-size math.
- Today's menu view grouped by meal slot (breakfast, lunch, dinner,
  snack).
- Recipes browse page with meal-type filter tabs and per-card calorie
  info.
- "Help Me Decide!" Tinder-style swipe planner with a remaining-budget
  pill and a serving-size bottom sheet on swipe-right.
- History page bucketed by day with per-day calorie totals and a
  bar-graph row for over/under-budget visibility.
- Friends: search by username, send/accept/decline requests, remove
  friends, see each friend's live daily progress bar.
- Profile/settings page with avatar picker, username edit, calorie
  target update, theme toggle, and sign-out.
- Theme toggle (light/dark) persisted in localStorage; defaults to
  system preference on first load.
- Live header with auth-aware nav links + display name.
- Three supabase migrations: `users`, `meals_log`, `recipes`,
  `friendships` with row-level security policies, plus a
  SECURITY DEFINER `get_friend_daily_stats(friend_ids)` RPC.
- Test framework: Vitest 4 + Testing Library + Playwright. 57 unit
  tests covering route gating, calorie ring math, date helpers,
  shuffle, recipe partitioning, prefill validation, ILIKE escaping,
  ThemeToggle, and the supabase client factory. 3 Playwright E2E
  smokes. GitHub Actions CI runs lint + test + build on push and PR.
- `TESTING.md` describing the test layers and conventions; `CLAUDE.md`
  gets a `## Testing` section.

### Security
- Closed an onboarding auth bypass. `onboarding_completed` is now
  sourced from `public.users` (RLS-locked) instead of the
  client-writable `user_metadata` JWT field.
- Replaced the blanket `users` SELECT policy with three
  SECURITY DEFINER RPCs (`search_users`, `get_friend_profiles`,
  `get_request_profiles`) so non-friends cannot read
  `daily_calorie_target` or enumerate the user table via
  `%`-wildcard search.
- Tightened the friendships UPDATE policy (`WITH CHECK`),
  blocked self-friending, and added a symmetric unique index that
  prevents simultaneous (A→B, B→A) rows.
- Hot-path indexes: `meals_log(user_id, logged_at DESC)`,
  `friendships(addressee_id)`, `friendships(requester_id)`.

### Changed
- Upgraded to Next.js 16, React 19.2, TypeScript 6, Tailwind 4.3,
  ESLint flat-config native (eslint-config-next 16).
- Replaced `.single()` with `.maybeSingle()` across home, history,
  menu, suggest, plan, profile, and the auth-aware header so a
  half-completed signup does not 500 the page.
- /friends search now goes through `search_users` RPC; ILIKE
  wildcards are escaped both client-side (`escapeIlike`) and
  server-side (`ESCAPE '\'`).
- /log query-string prefill validates calories (rejects NaN,
  Infinity, negatives, > 100k) and clamps name to 200 chars.

### Fixed
- ThemeToggle no longer calls `setState` synchronously in an effect
  (eliminates cascading render). Initial theme reads from
  `localStorage` via lazy init.
- /plan now uses `<Link>` instead of an `<a>` for the home link
  after completing the swipe deck.
- /friends remove-friend button now has an `aria-label`.
