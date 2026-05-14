
## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review

## Design System

Always read [DESIGN.md](./DESIGN.md) before making any visual or UI decision.
All font choices, colors, spacing, motion, and aesthetic direction are defined
there. Do not deviate without explicit user approval.

Key guardrails:
- Coral `#e85d4f` is the action color, never green.
- Fraunces (serif) for display; Instrument Sans for body; Geist Mono for numbers.
- Buddy voice = `Fraunces Italic`; system voice = `Instrument Sans`.
- No `system-ui`/`Arial` as primary font anywhere.
- See DESIGN.md "Anti-slop guardrails" for the full no-go list.

In QA mode, flag any code that doesn't match DESIGN.md.

## Testing

- Unit/component: `npm test` (Vitest + Testing Library, jsdom). Files under `test/` or co-located `*.test.tsx`.
- E2E: `npm run test:e2e` (Playwright, boots `npm run dev`). Specs under `e2e/`.
- See [TESTING.md](./TESTING.md) for conventions.

Expectations:
- 100% coverage is the goal — tests make vibe coding safe.
- New function → write a test. New conditional → test both branches.
- Bug fix → write a regression test that fails on the old code.
- Never commit code that makes existing tests fail.
