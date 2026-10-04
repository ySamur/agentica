# agentica

Russian-language site for developers moving from hand-written code to Claude Code. Guests get the landing; members sign in (Google or email + password via Supabase Auth) and get Кабинет, Маршрут (6 stages and a capstone, 31 steps, saved progress), Библиотека (materials that open with passed steps) and Профиль.

**Stack:** React 19 · TypeScript 7 · Vite 8 · React Router 8 (`react-router`) · Supabase JS · GSAP + Lenis (landing only) · Playwright · oxlint.

## Commands

| Command | Notes |
|---|---|
| `npm run dev` | Port 3000, else the next free one: use the printed `Local` URL. |
| `npm run lint` | oxlint, 0 errors. |
| `npm run build` | Typecheck, then Vite build. |
| `npm test -- --project=desktop` | Playwright, desktop project only. |
| `npm run test:security` | Grants and RLS; after any change in `supabase/migrations/`, `content/guide/` or `content/library/`. |
| `npm run guide:content -- <step-id>` | Writes the migration that publishes a lesson from `content/guide/`. |
| `npm run library:content` | Writes the migration that syncs the library with `content/library/`. |

Before reporting a change as done, run the `verify` skill.

## Where things live

- `src/app/App.tsx`: routes and `Layout` (header, page cross-fade through `<ViewTransition>`, arrival focus, anchor scrolling).
- `src/features/<name>/`: feature code: `auth`, `guide` (Маршрут), `library` (Библиотека), `landing`, `starter` (prompt dialog). Pages in `src/pages/<name>/`, shared UI in `src/components/`, helpers in `src/lib/`.
- `supabase/migrations/`: schema, grants, RLS, published lessons. `tests/`: Playwright specs and helpers, the SQL security test.
- `content/guide/`: lesson sources with answer keys; `content/library/`: library materials (neither imported by `src/`); `scripts/`: their compilers and migration generators. Lesson map and content workflow: `docs/GUIDE_PLAN.md`.
- `docs/AUTH_SETUP.md`: the owner-run setup checklist and the migration list.
- `.claude/rules/`: area rules (landing, auth, guide, supabase, tests, styles); each loads with the files it covers.

## Routes

- `/`: the landing for guests, `CabinetPage` for members. While the SDK restores the session, a stored one or an OAuth code counts as a member (`useSessionPending()`, for the header too), so members never see the landing flash. Members' header: Кабинет, Маршрут, Библиотека and «Продолжить».
- `/path`, `/path/:stage/:step`, `/library`, `/profile` and `/password` (new password: after a reset letter, or from the profile) sit behind `RequireAuth`; guests go to `/login?next=…`. Also `/login` and `/auth/callback`.
- Redirects: `/content` → `/path`; `/settings` and `/settings/profile` → `/profile`; trailing slashes are stripped.
- Only the landing ships in the main chunk; every other page is `React.lazy`.
- A new page needs a tab title in `titles` (`App.tsx`; otherwise it reads «Страница не найдена»), an `h1` with `tabIndex={-1}` and, for members, an entry in `allowedDestinations` (`src/features/auth/redirect.ts`; otherwise sign-in returns to `/`).

## Rules

### Scope
- Desktop only for now: no responsive layouts (no mobile or tablet breakpoints), no mobile tests, no mobile viewport checks. Leave existing mobile code as is unless asked.
- "Landing" means the guest page only; the members' pages are Кабинет, Маршрут, Шаг, Библиотека, Профиль.
- Out of scope: other sign-in methods.
- Account work, one stage at a time (branch `account`): password reset (done), email change, avatar upload, account deletion, hosting.

### UI
- Russian UI copy; every string goes through `nbsp()` (`src/lib/typography.ts`).
- Keyboard navigation and focus everywhere. After a link, `Layout` focuses the new page's `h1[tabindex="-1"]` (`useArrivalFocus`).
- Respect reduced motion: `prefersReducedMotion()` and `motionAllowed()` in `src/lib/motion.ts`.
- Anchors scroll with `scrollToTarget()`; modals use `lockScroll()`/`unlockScroll()` (`src/lib/smoothScroll.ts`). Both drive Lenis while the landing runs it.
- Reuse the shared pieces from `src/styles.css` before inventing new ones. One `.glow-button` per screen (the main action), the rest `.ghost-button`.

### Code
- 2 spaces, single quotes, semicolons, ESM. PascalCase components and their files, camelCase code, kebab-case CSS classes. No formatter: match the surrounding code.
- Strict types (TS 7 has `strict` on by default).
- oxlint (`.oxlintrc.json`; typescript-eslint has no TS 7 support): 0 errors, justify every `oxlint-disable` inline.
- A PostToolUse hook type-checks after every `.ts`/`.tsx` edit; fix what it reports before moving on.

### Security
- `.env.local` holds only the Supabase URL and Publishable key (plus the optional public `VITE_SITE_URL`): never OAuth secrets or service-role keys. `.env*` files are deny-listed; never ask for their contents.
- Enforce access with grants and RLS, not route guards alone. Never add production auth bypasses.
- Supabase MCP (`.mcp.json`, untracked) has write access (owner's decision, 2026-10-03: a test project, no production). Apply migrations with `apply_migration`, one file at a time, in name order; never change data or schema outside a migration file.

### Environment
- Windows. In PowerShell run `npm.cmd`, and never rewrite files with `Get-Content`/`Set-Content`: PowerShell 5.1 reads BOM-less UTF-8 as cp1251 and mangles the Russian text. Files are UTF-8 without BOM, LF; edit them with Edit/Write.
- Playwright owns ports 4317/4318. Stop the servers you start; never kill unrelated processes.

### Git
- Focused commits with imperative conventional subjects (`feat: …`, `fix: …`). Keep `dist/`, `test-results/` and `.local/` out of them.
- PRs: problem, behavior, validation commands, desktop screenshots for visual changes.
