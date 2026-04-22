# TODOS

## Onboarding flow (before Step 4)

**What:** A 3-screen onboarding flow: welcome → set daily calorie target → create profile (username, avatar).
Runs once after first signup.

**Why:** Step 4 requires `daily_calorie_target` to be set for the "Help Me Decide!" calorie budget filter.
Without onboarding, users hit Home with no target and no identity. The app works but feels incomplete.

**Pros:** Clean first-time UX. `daily_calorie_target` is available from day one for streak + plan screens.
**Cons:** Design work required before Step 4 ships. Adds a dependency between Steps 3 and 4.

**Context:** `daily_calorie_target` is a new column on the `users` table (added in the eng review, 2026-04-14).
Build the onboarding form as part of Step 3 (Supabase auth setup). 3 screens: Welcome → Set Target → Profile.
Default target = 2000 kcal (user can change in Profile later).

**Depends on:** Step 3 (Supabase auth), `users` table with `daily_calorie_target` column.

---

## Serving size prompt in "Help Me Decide!" (Step 7)

**What:** After the user swipes right in the Tinder swiper, show a bottom sheet:
"How many servings?" with a number input pre-filled with 1. User taps confirm. Then the meal is logged.

**Why:** Recipes have serving sizes (e.g., Pancakes: 550 cal per serving). Swiping right with no
serving size prompt silently logs 1 serving regardless of actual consumption. Macro accuracy breaks.
The <20% correction rate success criterion is undermined.

**Pros:** Correct calorie logging. Consistent with the Log Meal recipe flow (also sets serving size).
**Cons:** Adds one tap to the swipe-right interaction. Slightly reduces "instant" feel of the swiper.

**Context:** "Help Me Decide!" Tinder swiper is Step 7. The bottom sheet pattern is already common
in the design (warm palette, rounded cards). Keep the prompt minimal: number stepper + confirm button.

**Depends on:** Step 7 (Plan screen + Help Me Decide! implementation).
