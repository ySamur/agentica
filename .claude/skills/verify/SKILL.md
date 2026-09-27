---
name: verify
description: Run this project's full verification (typecheck, lint, build, Playwright, SQL security) scoped to what changed. Use before reporting a code change as done.
---

Run the checks in order and stop at the first failure, fixing it before continuing. In PowerShell use `npm.cmd` instead of `npm`.

1. `npm run typecheck`
2. `npm run lint` — errors must be zero; new warnings need a reason or a fix.
3. `npm run build`
4. Playwright, scoped to the change:
   - UI, auth, or routing changes: `npm test` (desktop and mobile).
   - Logic-only changes with no layout impact: `npm test -- --project=desktop`.
   - A single area: `npm test -- tests/auth.spec.ts`.
5. `npm run test:security` when anything in `supabase/migrations/` changed.

Playwright starts its own servers on ports 4317/4318. If a port is busy, report it; do not kill processes you did not start. Stop any dev server you started.

Report: each command, pass/fail, and for failures the relevant output. Screenshots are in `.local/screenshots/`, traces in `test-results/`.
