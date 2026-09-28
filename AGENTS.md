# Agent rules

Russian-language React 19 + TypeScript 7 + Vite app: landing, Google sign-in via Supabase, profile, members-only content.

## Architecture
- `src/app/App.tsx` owns routes. Only the landing ships in the main chunk; other pages use `React.lazy`.
- `src/lib/supabase.ts` loads the SDK lazily and creates one client (`getSupabase()`, `null` when unconfigured).
- Feature code stays in `src/features/<name>/`; shared UI in `src/components/`; layered styles in `src/styles.css` and `src/account.css`.
- The landing's agent demo is simulated. Out of scope: hosting, other sign-in methods, avatar upload, account deletion.

## Rules
- Keep Russian UI copy, keyboard navigation and focus handling, reduced-motion support, strict types.
- Style: 2 spaces, single quotes, semicolons, ESM; PascalCase components and files, camelCase code, kebab-case CSS. No formatter: match surrounding code.
- Lint is oxlint (`.oxlintrc.json`; typescript-eslint lacks TS 7 support): 0 errors, justify every `oxlint-disable` inline.
- Checks: `npm run lint`, `npm run build` (includes typecheck), `npm test` (`-- --project=desktop` for logic-only changes), `npm run test:security` after migration changes.
- Tests: Playwright on installed Chrome, desktop + iPhone emulation. Mock Supabase only at the network boundary via `tests/helpers/auth.ts`; never add production auth bypasses. Cover changed interactions, focus, responsive layout.
- Security: `.env.local` holds only the Supabase URL and Publishable key, never OAuth secrets or service-role keys. Enforce access with grants and RLS, not route guards alone. Owner-run setup: `docs/AUTH_SETUP.md`.
- Playwright owns ports 4317/4318. Dev prefers port 3000 and falls back to a free one (use the printed `Local` URL). Stop servers you start; never kill unrelated processes. PowerShell: `npm.cmd`.
- Keep `dist/`, `test-results/`, `.local/` out of commits.
- Commits: focused, imperative conventional subjects (`fix: …`). PRs: problem, behavior, validation commands, desktop/mobile screenshots for visual changes.
