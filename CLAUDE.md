
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

## Testing

- Unit/component: `npm test` (Vitest + Testing Library, jsdom). Files under `test/` or co-located `*.test.tsx`.
- E2E: `npm run test:e2e` (Playwright, boots `npm run dev`). Specs under `e2e/`.
- See [TESTING.md](./TESTING.md) for conventions.

Expectations:
- 100% coverage is the goal — tests make vibe coding safe.
- New function → write a test. New conditional → test both branches.
- Bug fix → write a regression test that fails on the old code.
- Never commit code that makes existing tests fail.
