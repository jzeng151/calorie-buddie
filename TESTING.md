# Testing

100% test coverage is the goal — tests make vibe coding safe. They let you move fast, trust your instincts, and ship with confidence. Without tests, vibe coding is just yolo coding.

## Stack

- **Vitest 4** — unit + component tests (`npm test`, `npm run test:watch`)
- **@testing-library/react** — component testing with user-facing queries
- **@testing-library/user-event** — realistic interaction simulation
- **jsdom** — DOM environment for component tests
- **Playwright** — end-to-end browser tests (`npm run test:e2e`)

## Commands

```bash
npm test              # run all unit/component tests once
npm run test:watch    # watch mode for development
npm run test:e2e      # run Playwright E2E suite (boots dev server)
```

## Layout

```
test/                       # unit + component tests (vitest)
  setup.ts                  # global test setup (jest-dom + cleanup)
  *.test.ts(x)
e2e/                        # Playwright E2E tests
  *.spec.ts
vitest.config.ts            # vitest config (jsdom, @/ alias)
playwright.config.ts        # playwright config (boots dev server)
```

Co-locating tests next to source (`src/**/*.test.tsx`) is also supported.

## Test layers

- **Unit tests** — pure functions, utilities, hooks in isolation. Mock all I/O.
- **Component tests** — render React components, simulate user interaction, assert on rendered output. Use `screen.getByRole` and other accessibility-first queries. Mock data layer (Supabase) at the boundary.
- **E2E tests** — full user journeys through the running app. No mocking. Auth, data, navigation all real.

## Conventions

- One behavior per `it()` — name the behavior, not the implementation.
- Prefer `getByRole` / `getByLabelText` / `getByText` over `getByTestId`. Use what the user sees.
- Mock the Supabase client at the module boundary, not individual calls.
- `beforeEach` resets globals (localStorage, document attributes). Never rely on test order.

## What to test

- New function → write a test.
- Bug fix → write a regression test that fails on the old code.
- New conditional (if/else, switch) → test BOTH branches.
- New error handler → test the error path triggers correctly.
- Never commit code that makes existing tests fail.
