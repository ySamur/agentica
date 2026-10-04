---
paths:
  - "tests/**"
  - "playwright.config.ts"
---

# Tests

- Playwright runs the installed Chrome. Run only the `desktop` project: `npm test -- --project=desktop`, one file with `npm test -- --project=desktop tests/auth.spec.ts`. The `mobile` (iPhone 13) project stays in the config but is not run.
- Servers: 4317 with a fake Supabase config (`https://agentica-test.supabase.co`), 4318 unconfigured. Every checkout, worktrees included, shares these ports: never run two suites at once.
- Mock Supabase only at the network boundary, through `mockAuth()` and its `FixtureState` (`tests/helpers/auth.ts`).
- Cover changed interactions and focus.
- Call `settle()` (`tests/helpers/page.ts`) before a screenshot. Screenshots go to `.local/screenshots/`, traces to `test-results/`; both are git-ignored.
- `tests/security.test.mjs` is a Node test (`npm run test:security`), not Playwright.
