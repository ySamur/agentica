# Guide plan (Маршрут)

Goal: turn the members' route into a real guide from hand-written code to orchestrating agents. Readers are experienced developers: no fluff, no forced order, proof over promises.

## Owner decisions (2026-10-02)
- The agent drafts lesson texts from the official Claude Code docs; the owner edits tone and adds examples.
- A step with a check is passed by passing it; «Уже умею» jumps to the check. Steps without one (stage 0, capstone, unwritten) keep manual «Выполнено»/«Уже умею».
- Answers are graded on the server; keys never reach the browser.
- No free-text input anywhere: choices only. Onboarding answers go to `user_metadata`.
- Role wording: «Разработчик-оркестратор» / «Разработчик, который управляет агентами».
- Work one visible iteration at a time: show desktop screenshots, wait for the owner's go-ahead.

## Lesson anatomy (10–15 min)
1. Outcome: one line, what the member can do after the step.
2. Teaching blocks: short text between visuals: `session` (scripted Claude Code session), `compare` (before/after prompt or code), `diagram`, `callout` (`trap`, `tip`), `command` (copyable).
3. Practice: one task in the member's own project or sandbox, plus a «Готово, если» list.
4. Check: 2–4 scenario questions ("the agent proposes X; what do you do?"), not trivia. Every option has a `why`; the right one starts with «Да.».

Format, workflow and security rules: `.claude/rules/guide.md`. Facts: verify each against code.claude.com docs (the `claude-code-guide` agent), cite the pages in the source's header comment, set `verified`.

## Roadmap
1. **Done (2026-10-02):** lesson engine, server-checked quiz, pilot 3.2 «План до кода».
2. **Stage 0 as onboarding** (`/welcome`, first sign-in lands here): choice cards (experience, stack, where you are with AI, goal, playground: own project or sandbox) saved in `user_metadata`; Кабинет shows the goal and suggests stages to pass by check. Profile gets the same fields.
3. **Stage 1 «Первый контакт»**, all 5 steps, plus a «Этап пройден» screen.
4. **Stages 2–6**, one stage per iteration.
5. **Библиотека `/library`**: prompts (moved from `StarterDialog`), CLAUDE.md templates, checklists; a step's material unlocks when it is passed. Progress in Профиль.
6. **Capstone** (idea → PR, «Было / Стало» reusing `RoleShift`), public profile with verified progress; then landing copy («Маршрут уже внутри», FAQ, chapters = stage titles).

## Per iteration
- Lint, build, `npm test -- --project=desktop`, `npm run test:security`; desktop screenshots via `screenshot()` (`tests/helpers/page.ts`).
- New migrations go into `docs/AUTH_SETUP.md`; apply through Supabase MCP only with the owner's write access, then back to `read_only=true`.
