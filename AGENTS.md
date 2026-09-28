# Repository Guidelines

## Project Structure & Module Organization

This Russian-language React/TypeScript/Vite app includes a landing page and Supabase authentication.

- `src/main.tsx` bootstraps the app; `src/app/App.tsx` composes pages.
- `src/pages/landing/` contains the landing page.
- Other `src/pages/` directories contain login, profile, and protected content.
- `src/features/auth/` owns sessions and account navigation; `src/lib/supabase.ts` loads the SDK lazily and creates one client (`getSupabase()`); only the landing is in the main chunk, other pages use `React.lazy`.
- `src/features/workflow/` and `src/features/starter/` own the agent demonstration and prompt dialog.
- `src/components/` contains shared components and SVG icons.
- `src/styles.css` and `src/account.css` contain layered, responsive styles.
- `public/` holds static assets; fonts are bundled through Fontsource dependencies.
- `tests/*.spec.ts` contains browser tests; `supabase/migrations/` contains database changes.

Keep generated `dist/`, `test-results/`, and `.local/` files out of commits.

## Build, Test, and Development Commands

- `npm ci`: install dependencies from `package-lock.json`.
- `npm run dev` or `npm start`: start Vite on localhost, preferring port 3000.
- `npm run dev:lan`: start Vite on all network interfaces (only when LAN access is needed).
- `npm run typecheck`: check TypeScript for `src/` and, via `tsconfig.node.json`, tests and configs.
- `npm run lint`: run oxlint (correctness, React hooks, JSX a11y).
- `npm run build`: type-check and generate the production bundle in `dist/`.
- `npm run preview`: serve the production build locally.
- `npm test`: run Playwright desktop and mobile projects.
- `npm test -- --project=desktop`: run only desktop tests.
- `npm run test:security`: verify SQL privileges and RLS in PGlite.

Use `npm.cmd` if PowerShell blocks `npm`. Development falls back to a free port; use the printed `Local` URL. Playwright owns ports 4317/4318 with isolated caches and fake configuration. Stop servers you start after verification; do not terminate unrelated processes.

## Coding Style & Naming Conventions

Use two-space indentation, single-quoted TypeScript strings, semicolons, and ES modules. Name React components and files in PascalCase (`StarterDialog.tsx`), functions and state in camelCase, and CSS classes in kebab-case. Keep feature-specific behavior inside its feature directory. Preserve strict typing, Russian UI copy, keyboard navigation, and reduced-motion support.

oxlint is configured in `.oxlintrc.json` (typescript-eslint does not support TypeScript 7). No formatter is configured; follow surrounding code. Keep `npm run lint` free of errors; justify any `oxlint-disable` comment inline.

## Testing Guidelines

Use Playwright with installed Google Chrome; mobile tests emulate an iPhone in Chromium. Name tests `*.spec.ts`. Mock Supabase at the network boundary using `tests/helpers/auth.ts`; never add production authentication bypasses. Cover changed interactions, focus, and responsive layout. No coverage threshold is configured. Screenshots go to `.local/screenshots/`; traces go to `test-results/`. Run relevant tests and the build for code changes; run SQL tests for migration changes.

## Commit & Pull Request Guidelines

This workspace has no Git history available. Use concise, imperative commit subjects, for example `fix: refresh Vite dependency cache`. Keep commits focused. PRs should describe the problem, resulting behavior, validation commands, relevant issues, and desktop/mobile screenshots for visual changes.

## Security & Scope

Google authentication, profiles, and protected content require owner-managed setup in `docs/AUTH_SETUP.md`. Only the Supabase URL and Publishable key belong in `.env.local`. Never expose OAuth secrets or service-role keys. Enforce content access with grants and RLS, not route guards alone. The landing's agent demonstration remains simulated.
