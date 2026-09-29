# agentica

Russian-language React 19 + TypeScript 7 + Vite app: landing, Google sign-in via Supabase, profile, members-only content.

## Architecture
- `src/app/App.tsx` owns routes; `/` renders the landing for guests and `HomePage` for members. Only the landing ships in the main chunk; other pages use `React.lazy`.
- `src/lib/supabase.ts` loads the SDK lazily and creates one client (`getSupabase()`, `null` when unconfigured).
- Feature code stays in `src/features/<name>/`; shared UI in `src/components/`; layered styles in `src/styles.css`, `src/account.css` and `src/landing.css` (dark landing theme; header/footer overrides via `:root:has(.landing-page)`).
- The landing opens with one sticky scene (`TypingFilm`): scroll-scrubbed WebP frames, the agent's terminal (`ClaudeSession`) typing by scroll, then the hero with the CTAs. Scene progress points live in `introPhases.ts` (shared with tests). Frames: `public/frames/typing/{desktop,desktop-hd,mobile}`, 120 each, cut from Pexels clip 7534237 by Mikhail Nilov (free license) with the brand grade baked in; reduced motion and data saver get one still.
- Landing motion is the lazy chunk `src/features/landing/motion/`: GSAP (ScrollTrigger, SplitText, ScrambleText, DrawSVG; Standard no-charge license) and Lenis smooth scrolling for fine pointers only. Components render static, finished markup; `main[data-motion]` is `pending|on|off` (`off`: reduced motion, data saver, screens under 560px tall, or the chunk not arriving within 4 s). Import `gsap`/`@gsap/react`/`lenis` only there, or they land in the main chunk. Scrubbed staggers need explicit start states (`gsap.set`); a callback that renders from a tween also runs `onRefresh`.
- Anchors scroll through `scrollToTarget` and modals use `lockScroll`/`unlockScroll` (`src/lib/smoothScroll.ts`). Landing copy goes through `nbsp()` (`src/lib/typography.ts`); accent words use `.accent` (Cormorant Italic).
- Route changes cross-fade through React's `<ViewTransition>` in `Layout`; the landing's `SignupLink` pill morphs into the login card (`.signup-morph` in `styles.css`).
- The landing's Claude Code session and the home page's agent demo are simulated. Out of scope: hosting, other sign-in methods, avatar upload, account deletion.

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
- A PostToolUse hook type-checks after `.ts`/`.tsx` edits; fix reported errors before moving on.
- `.env*` files are deny-listed; never ask for their contents.
