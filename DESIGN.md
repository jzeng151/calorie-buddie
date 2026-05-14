# Design System — calorie-buddie

> Created by `/design-consultation` on 2026-05-13.
> Read this before making any visual, typographic, or UI decision.

## Product Context

- **What this is:** A calorie tracker, recipe finder/rater, and Tamagotchi-style
  social pet. The buddy is the centerpiece; tracking and recipes are how the
  buddy gets fed.
- **Who it's for:** People who want a habit tracker with personality, who'd rather
  show a friend a creature than a chart, and who value warmth over gamification.
- **Space/industry:** Mobile health / habit tracking / social pet.
- **Project type:** Mobile-first web app (Next.js 16), PWA-shaped, no native shell
  in v1.

## The memorable thing

**The buddy's face.** Personality over polish. Every type, color, motion, and
layout decision should serve the creature's character. If a choice doesn't make
the buddy more memorable, cut it.

## Aesthetic Direction

- **Direction:** Organic-warm + character-led.
- **Decoration level:** Intentional (subtle paper-grain where it earns its
  place; buddy and room are the expressive elements; UI chrome is calm).
- **Mood:** Like a friend's sketchbook. Warm, considered, handmade, with
  enough rigor to be a real product. NOT clinical-tracker, NOT corporate-SaaS,
  NOT Duolingo-gamified, NOT Finch-cute.
- **Reference orientation:** Closer to Cabinet of Curiosities than to the
  category baseline. Coral over green. Serif over rounded sans.

## Three Deliberate Risks (v1)

These are where calorie-buddie gets its own face. They are intentional departures
from the category. Do not "fix" them back to the norm.

1. **Serif display (Fraunces), not rounded geometric sans.** Most pet/wellness
   apps use Duolingo-style rounded sans. We don't. Serif says "warm and
   considered," not "gamified."
2. **Coral-red accent `#e85d4f`, explicitly not green.** Every wellness app uses
   green-for-growth. We use coral — food, warmth, blood, love-energy.
3. **Buddy speaks in serif italic.** When the buddy says "feeling better today,"
   the type itself is `Fraunces Italic`. System voice (the app talking, not the
   buddy) stays in `Instrument Sans`. The seam between buddy-voice and
   system-voice is typographic, not just copy.

## Typography

Load via Google Fonts. No `system-ui` anywhere as primary or fallback for display
or body text.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,500&family=Instrument+Sans:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
```

| Role | Font | Weight | Where used |
|------|------|--------|------------|
| Display / Hero | **Fraunces** | 600-700 | Hero headings, page titles, buddy name on home, recipe titles |
| Buddy voice | **Fraunces Italic** | 400 | All captions attributed to the buddy. CSS class: `.buddy-voice` |
| Body / UI | **Instrument Sans** | 400-600 | All other text. System voice. Form labels. Button labels. |
| Numbers / Data | **Geist Mono** (with `font-variant-numeric: tabular-nums`) | 400-500 | Calorie counts, streak counts, hydration, recipe macros, timers |

### Scale (rem, base 16px)

| Token | Size | Use |
|-------|------|-----|
| display | 3.0 rem (48px) | Hero hero |
| h1 | 2.25 rem (36px) | Page titles |
| h2 | 1.75 rem (28px) | Section headings |
| h3 | 1.375 rem (22px) | Card titles, buddy name |
| body | 1.0 rem (16px) | Default |
| small | 0.875 rem (14px) | Metadata, captions |
| caption | 0.8125 rem (13px) | Eyebrow labels, tags |

### Voice rules

- **Buddy-voice copy** is first-person, lowercase, no terminal period.
  Examples: `"feeling steady today"`, `"i'm good on water for today"`,
  `"hi! i'm your new buddy. log a meal so i know what we're up to"`.
- **System-voice copy** is sentence case with normal punctuation. Examples:
  `"Alex hasn't moved in yet — give them a nudge?"`,
  `"Couldn't refresh — showing your last visit."`.
- The seam: anything attributed to the buddy as a feeling is buddy-voice;
  anything about the app's behavior is system-voice.

## Color

### Approach

Restrained warm-earth palette anchored by one saturated coral accent.

### Light mode

| Token | Hex | Role |
|-------|-----|------|
| `--color-bg` | `#f5e6d3` | Page background |
| `--color-surface` | `#faf0e2` | Cards, alerts, mockup frames |
| `--color-surface-2` | `#efe1cd` | Subtle secondary surface (stats strip, hover) |
| `--color-ink` | `#3d2817` | Primary text |
| `--color-muted` | `#6b5444` | Secondary text |
| `--color-border` | `#d4a5a5` | Borders, dividers |
| `--color-header` | `#e8bdc4` | Header band, avatar background |
| `--color-accent` | `#e85d4f` | Primary action (buttons, links, focus rings, active states) |
| `--color-accent-hover` | `#d04a3c` | Hover state for accent |
| `--color-success` | `#6b8e5c` | Streak increment, recovery confirmation (sage, NOT bright green) |
| `--color-warning` | `#c9924a` | Over-target nudge (amber-brown) |
| `--color-error` | `#b04848` | Failed actions (clay-red, distinct from accent coral) |
| `--color-info` | `#6b8a9e` | Informational toasts (slate-blue) |
| `--color-shadow` | `rgba(61,40,23,0.08)` | Soft shadows |

### Dark mode

Activated via `data-theme="dark"` on `<html>`. Same semantic tokens, recalibrated.
Not a CSS overlay — dark mode is a separately designed surface.

| Token | Hex |
|-------|-----|
| `--color-bg` | `#1a0f0a` |
| `--color-surface` | `#2d1f1a` |
| `--color-surface-2` | `#3a2820` |
| `--color-ink` | `#f5e6d3` |
| `--color-muted` | `#c9a98a` |
| `--color-border` | `#4a2f2a` |
| `--color-header` | `#2d1f1a` |
| `--color-accent` | `#f07868` (lifted coral for contrast against dark bg) |
| `--color-accent-hover` | `#ff8a7a` |
| `--color-success` | `#8aae7c` |
| `--color-warning` | `#d9a55a` |
| `--color-error` | `#c66060` |
| `--color-info` | `#8eaab8` |

### Color rules

- **Accent coral is the action color.** Buttons, links, focus rings, active tab.
  Never use any other color for primary action.
- **Error red `#b04848` is reserved for failed actions.** Visually distinct from
  accent coral. Do not use coral for error states.
- **No purple/violet gradients.** Anywhere. Hard rejection.
- **No green-for-growth.** Success uses sage `#6b8e5c`, never bright green.
- **Semantic colors are always muted from the warm family,** never bright
  defaults. They live alongside the palette, not on top of it.

## Spacing

- **Base unit:** 8px
- **Density:** Comfortable (generous but not luxurious)

| Token | Value |
|-------|-------|
| `--s-2xs` | 2px |
| `--s-xs` | 4px |
| `--s-sm` | 8px |
| `--s-md` | 16px |
| `--s-lg` | 24px |
| `--s-xl` | 32px |
| `--s-2xl` | 48px |
| `--s-3xl` | 64px |

**Touch targets ≥ 44×44px** on all interactive elements. Non-negotiable for
mobile-first.

## Layout

- **Approach:** Hybrid. Grid-disciplined for `/menu`, `/plan`, `/recipes`,
  `/profile`. Creative-editorial for `/buddy` and `/friends/[id]/room` (the room
  is a scene, not a card).
- **Grid:** Single column on mobile, max-width centered on tablet/desktop.
- **Max content width:** 720px on `/buddy` and `/friends/[id]/room`. 1120px on
  marketing/index pages.
- **Viewport breakpoints:**
  - Mobile: `<768px` (default)
  - Tablet: `768-1023px`
  - Desktop: `≥1024px`

### Buddy sprite sizing

| Viewport | Buddy size |
|----------|-----------|
| Mobile | 60vw square |
| Tablet | 320px square |
| Desktop | 360px square in centered hero |

### Border radius (hierarchical, NOT uniform)

| Token | Value | Use |
|-------|-------|-----|
| `--r-sm` | 4px | Buttons, form inputs |
| `--r-md` | 8px | Cards, recipe tiles, alerts |
| `--r-lg` | 16px | Buddy room scene container |
| `--r-pill` | 9999px | Chips, tags, avatars, hydration counter |

Avoid uniform-bubbly border-radius on every element. That's a slop signal.

## Motion

- **Approach:** Intentional. Animation supports comprehension and personality,
  not decoration.
- **Easing:**
  - Enter: `ease-out`
  - Exit: `ease-in`
  - Move: `ease-in-out`
- **Duration:**
  - Micro (focus, hover): 50-150ms
  - Short (state transitions, button press): 150-300ms
  - Medium (page transitions, slide-ins): 300-500ms
  - Long (celebrations, recovery animations): 1.5s
- **Buddy idle loops:** 2-3 second cycles.
- **Recovery animation (scruffy → neutral):** 1.5s shake-off cross-fade.
- **Celebration (decor unlock):** 1.5s confetti burst + buddy bounce + decor
  slide-in. Stack sequentially on multi-unlock, cap at 3.

### Reduced motion

Honor `prefers-reduced-motion: reduce`:

- Rive idle loops swap to the static emotion PNG.
- Celebration confetti becomes a 300ms opacity fade-in on new decor.
- Recovery shake-off becomes a 300ms cross-fade between scruffy and neutral PNGs.
- Page transitions become instant.

## Accessibility floor (non-negotiable)

- **Contrast ≥ 4.5:1** for all text including locked-decor hints. No
  whisper-grey.
- **Touch targets ≥ 44×44px.**
- **Screen reader labels** on every interactive non-text element:
  - Buddy: `role="img"`, `aria-label="<emotion> buddy"` (updates with state)
  - Hydration tap: `aria-label="Log a glass of water, <N> of 8 today"`
  - Decor items: `aria-label="<name>, unlocked <date>"` or
    `"<name>, locked — <hint>"`
- **Keyboard nav:** logical tab order on every page, visible focus rings using
  the accent color, no keyboard traps.
- **Reduced motion** support as described above.

## Icons

Custom SVG icons, not emoji. Same stroke weight as the buddy outline.

Stroke-width target: `1.4-1.6px` at 14×14 viewport.

Minimum v1 icon set:
- **Calories:** flame
- **Streak:** calendar checkmark
- **Hydration:** drop
- **Buddy / room:** house outline
- **Recipe:** bowl
- **Friends:** linked silhouettes
- **Settings:** gear

Day-3 art lock includes the first 3 (calories, streak, hydration). The rest can
ship with their feature.

## CSS variable migration plan

The existing `src/app/globals.css` uses partial tokens (`--color-header-bg`,
`--color-text-dark`, etc.) and `Arial, Helvetica, sans-serif` as the body font.
That body-font line is the "I gave up on typography" signal flagged in this
consultation. Replace.

**Day 0 of buddy build:**
1. Replace `globals.css` token names with the canonical set in this doc.
2. Add the Google Fonts `<link>` to `src/app/layout.tsx`.
3. Replace the `body { font-family: Arial, ... }` with the `Instrument Sans`
   stack.
4. Add the `.buddy-voice`, `.system-voice`, and `.num` utility classes.
5. Add `data-theme="dark"` handling that's already in place for the dark token
   set.

This is ~1 hour of work. Do it before any buddy code so every new component
inherits the system.

## v1.5 Character Pass (NOT shipping in v1)

Tracked here, not lost. Pick up after v1 ships and the buddy is live.

1. **R1 — Hand-drawn UI strokes.** Buttons, dividers, frames in the same pen as
   the buddy. SVG asset set (~12-18 strokes). Adds about ½ day to the next art
   lock.
2. **R4 — Loading states ARE the buddy.** No spinners; buddy doing micro-tasks
   (`looking…`, `flipping pages…`, `tasting…`, `on the way…`). 4-6 micro
   animations in the Rive runtime, with PNG fallbacks.
3. **R2 — Asymmetric `/buddy` + polaroid friend visits.** Not picked this round
   but worth holding open. CSS-only.
4. **R3 — Buddy keeps a diary.** Deterministic template that narrates your last
   7 days through the buddy's eyes. A real product surface, ~2-3 days of build.

## Anti-slop guardrails (things we will NOT do)

- ❌ Purple/violet gradient backgrounds.
- ❌ Three-column feature grid with icons in colored circles.
- ❌ Centered everything with uniform spacing.
- ❌ Uniform bubbly border-radius on every element.
- ❌ Gradient buttons as the primary CTA pattern.
- ❌ Decorative blobs, floating circles, wavy SVG dividers.
- ❌ Emoji as design elements (icon role is fine if intentional; decoration role
  is not).
- ❌ `system-ui` / `-apple-system` as the primary display or body font.
- ❌ Green-for-growth as the action color (it's coral, see above).
- ❌ "Built for X" / "Designed for Y" marketing copy patterns.
- ❌ Cards inside cards inside cards (the room is a scene, not a card mosaic).

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-13 | Initial system created via `/design-consultation` | Buddy feature P0 prereq; existing CSS palette had no documentation and used `Arial` body font |
| 2026-05-13 | Fraunces serif over rounded geometric sans | Memorable thing is the buddy's face; serif says "warm and considered," not "gamified" |
| 2026-05-13 | Coral-red `#e85d4f` accent over Duolingo-green | Existing warm earth palette is the moat; green would erase the differentiation |
| 2026-05-13 | Buddy speaks in `Fraunces Italic` | Typographic seam between buddy-voice and system-voice; creates a literal "voice" on screen |
| 2026-05-13 | R1 (hand-drawn UI) + R4 (loading-as-buddy) deferred to v1.5 | Preserve 3-week v1 budget; foundational system locks first |
| 2026-05-13 | Replace `body { font-family: Arial ... }` Day 0 | The current body font is the "I gave up on typography" signal; must fix before buddy work |
