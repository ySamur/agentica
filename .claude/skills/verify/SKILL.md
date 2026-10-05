---
name: verify
description: Run this project's verification (lint, build with typecheck, Playwright, SQL security) scoped to what changed. Use before reporting a code change as done.
---

Run in order; stop at the first failure and fix it (PowerShell: `npm.cmd`).

1. `npm run lint`: 0 errors; new warnings need a fix or a reason.
2. `npm run build`: includes typecheck.
3. Playwright, desktop project only: `npm test -- --project=desktop`; one area: `npm test -- --project=desktop tests/auth.spec.ts`.
4. `npm run test:security` if `supabase/migrations/` changed.
5. `npm run test:hosting` if `vercel.json` or `index.html` changed.

Report each command with pass/fail and failure output (screenshots in `.local/screenshots/`, traces in `test-results/`).
