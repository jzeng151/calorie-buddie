# TODOS

Format: items grouped by component, then by priority (P0 → P4), Completed at bottom.

---

## Buddy feature (next major)

**Priority:** P1 — Approved design doc in `~/.gstack/projects/.../design-20260512-003749.md`.
The Tamagotchi-style health companion. 3-week build plan locked in.

- Week 1: `buddy_state` + `hydration_logs` schema, hydration tap on home, pure
  state computer with tests, Day-3 art lock, buddy room screen.
- Week 2: Home reshuffle around buddy hero, decor unlocks + emotion transitions,
  buddy naming flow.
- Week 3: Friend room visit `/friends/[id]/room`, decay tuning, Lottie/Rive SSR
  hardening.

**Depends on:** none — this branch ships the foundation the design doc assumes.

---

## Data layer

### P1 — Timezone-aware "today" boundary
`/` `/menu` `/suggest` `/plan` all compute the start of today with
`new Date().setHours(0,0,0,0)` on the **server**. Users west of the server
timezone see meals snap to the wrong day, and anyone using the app near midnight
sees rows shift. Store the user's IANA TZ on the profile (or read
`Intl.DateTimeFormat().resolvedOptions().timeZone` on first load) and pass it
through to the day-boundary computation.

### P2 — Pagination on /friends
`loadAll()` fetches every friendship the caller is party to. Fine at MVP, fire
at 10k friends. Add limit + load-more, and stop refetching everything after
`acceptRequest` (do an optimistic update like decline/remove already do).

### P2 — Profile auto-create trigger
A user can authenticate but not have a `public.users` row if onboarding errors
out. `.maybeSingle()` plus the fallback `?? 2000` cover most paths but observability
is zero. Add a Postgres trigger on `auth.users` INSERT to create the
`public.users` row idempotently.

---

## Auth / safety

### P1 — Double-submit guard on /log and /plan confirm
`handleSubmit` and `handleConfirm` await network on click; the disabled flag
only flips after the await is queued, so mashing the button twice on a slow
network inserts duplicate `meals_log` rows. Add a `submittingRef` guard at the
top of each handler, or use a client-generated idempotency key and upsert.

### P1 — Error surface on /plan confirm
If the meals_log insert in `handleConfirm` fails, the user advances to the next
card and never sees the error. Check the error and surface it in the sheet;
don't bump the index on failure.

### P2 — Rate limiting / CAPTCHA on signup
Supabase Auth has built-in throttles, but signup has no CAPTCHA and no email
verification gate before `onboarding_completed` is settable. A bot can pollute
user search. Turn on Supabase CAPTCHA and require email confirmation.

---

## Frontend / UX

### P2 — Inline styles → CSS Modules
Across most pages, style objects are recreated per render (e.g. `barStyle`,
`cardStyle`, `budgetPillStyle`). Irrelevant at MVP scale, but inconsistent with
`Features/ThemeToggle.module.css`. Pick CSS Modules and migrate the hot styles.

### P2 — A11y polish
- Avatar `<span>`s render emoji with no `aria-label`.
- Number inputs in onboarding/profile use sibling label-styled spans, not
  `<label htmlFor>`.
- Over-budget conveyed by color only — add an icon or text marker.
- Plan swipe buttons already have aria-labels. /friends remove now does too.

### P3 — Swipe pointer-capture
`/plan` drag handlers use `mousedown`/`mouseup` on the card. If the pointer
leaves the card while down, no end event fires and `dragStartX` stays set, so
the next click anywhere produces a spurious swipe. Move to pointer events with
`setPointerCapture`, or attach `mouseup` to `window`.

---

## Test coverage

### P1 — Component + integration coverage for core flows
Pure-function helpers are covered (57 unit tests). The user flows themselves
are smoke-only:
- Onboarding upsert (mocked supabase)
- /log form submit + validation guard
- /signup + /login error states (wrong password, taken email, network down)
- /friends request lifecycle (send → receive → accept → remove)
- supabase/server cookie plumbing in middleware path

### P2 — Expand Playwright E2E
Current E2E: 3 smokes. Add the golden path: signup → onboarding → log meal →
appears in /menu and /history. That single E2E lifts confidence more than 30
unit tests.

---

## Completed

- **Onboarding flow** — welcome → calorie target → username + avatar.
  Completed: v0.1.0.0 (2026-05-12). Implemented in `src/app/onboarding/page.tsx`.
- **Serving size bottom sheet in "Help Me Decide!"** — number stepper + confirm,
  prefilled to 1. Completed: v0.1.0.0 (2026-05-12). Plan page commit 74fdcc2.
