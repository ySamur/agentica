# Guide plan (Маршрут)

Goal: turn the members' route into a real guide from hand-written code to orchestrating agents. Readers are experienced developers: no fluff, no forced order, proof over promises.

## Owner decisions (2026-10-02)
- The agent drafts lesson texts from the official Claude Code docs; the owner edits tone and adds examples.
- A step with a check is passed by passing it; «Уже умею» jumps to the check. Steps without one (capstone, unwritten) keep manual «Выполнено»/«Уже умею».
- Answers are graded on the server; keys never reach the browser.
- No free-text input anywhere: choices only.
- 2026-10-03: stage 0 «Точка отсчёта» and the onboarding built on it are dropped; the route starts at stage 1. Supabase MCP keeps write access (test project).
- 2026-10-04: no public profile and no sharing of progress, now or later. Step ★.3 (id `public-profile`) became «Ваша система работы с агентами»: the result is collected in the member's project; showing it is the member's own call.
- Role wording: «Разработчик-оркестратор» / «Разработчик, который управляет агентами».
- Work one visible iteration at a time: show desktop screenshots, wait for the owner's go-ahead.

## Lesson anatomy (10–15 min)
1. Outcome: one line, what the member can do after the step.
2. Teaching blocks: short text between visuals: `session` (scripted Claude Code session), `compare` (before/after prompt or code), `diagram`, `callout` (`trap`, `tip`), `command` (copyable), `code` (a file with its name, copyable).
3. Practice: one task in the member's own project or sandbox, plus a «Готово, если» list.
4. Check: 2–4 scenario questions ("the agent proposes X; what do you do?"), not trivia. Every option has a `why`; the right one starts with «Да.».

Format, workflow and security rules: `.claude/rules/guide.md`. Facts: verify each against code.claude.com docs (the `claude-code-guide` agent), cite the pages in the source's header comment, set `verified`.

## Roadmap
1. **Done (2026-10-02):** lesson engine, server-checked quiz, pilot 3.2 «План до кода».
2. **Done (2026-10-03):** the capstone (3 lessons without checks; the whole route now has lessons). Earlier: stage 6 «Оркестровка» (diagram `subagents`). Earlier: stage 5 «Автоматизация» (diagram `hook-events`). Earlier: stage 4 «Ревью» (a `diff` block with reviewer marks; diagram `delegation-grid`). Earlier: stage 3 «Постановка задач» complete (diagram `step-ladder`). Earlier: stage 2 «Контекст» (4 lessons, diagrams `context-window`, `memory-layers`; `compare` sides can show file content). Earlier: lesson map (below), `code` block, «Этап пройден» card, stage 1 «Первый контакт» (5 lessons, diagrams `permission-modes`, `checkpoints`).
3. **Done (2026-10-03):** stages 2–6, one stage per iteration: 2 «Контекст», 3 (three remaining steps), 4 «Ревью» (+ a `diff` block), 5 «Автоматизация», 6 «Оркестровка»; then the capstone (no checks: practice and manual marks).

## Lesson map
One line per step: outcome · key facts (re-verify each against the docs when writing; ⚠ = unconfirmed in the 2026-10-03 research) · check themes · links. Stages build on each other: refer back instead of repeating.

**1 Первый контакт** (written)
- `install`: installed, signed in, first questions · native installer, no `sudo npm`, `claude -c/-r`, `/init`, `claude doctor` · where to run, resume, sudo.
- `permissions`: knows what runs without asking; sets project rules · `auto` is the starting mode (v2.1.283+), falls back to `default`; Shift+Tab cycle; deny → ask → allow; `.claude/settings.json` vs `.local` · deny wins, auto start, mode for exploring, deny list.
- `explore-code`: uses the agent as a researcher, verifies answers · `@` files and folders; ask for files and functions; ask about absence · precise question, confident answer, known file.
- `first-edit`: small edit with a criterion; reads diffs; declines with feedback · Esc, queued messages, `acceptEdits`, give a pass/fail check · criterion, wrong file, green tests.
- `checkpoints`: rewinds safely, knows the limits · Esc Esc, `/rewind` options, not tracked: commands, manual and subagent edits; ~30 days · rm vs files, restore code only, why git.

**2 Контекст**
- `project-view`: knows what fills the context and how to look · context window; loaded at start (system prompt, CLAUDE.md, auto memory, git status); `/context`; auto-compaction · what the agent sees on start, why answers degrade late in a session.
- `claude-md`: writes a short, useful CLAUDE.md · locations (`~/.claude/CLAUDE.md`, `./CLAUDE.md`, subfolder files on demand), `@path` imports, `.claude/rules/` with `paths`, `/init`, `/memory`; ⚠ `CLAUDE.local.md`, `#` shortcut · what belongs, where to put a personal preference, a 300-line file. Uses the `code` block.
- `conventions`: puts commands, style and checks where the agent obeys them · what to include / leave out (best practices), "would removing this cause mistakes?", verification commands; CLAUDE.md is advice, hooks enforce (→ 5.1) · which line to cut, rule vs hook.
- `clean-context`: keeps long sessions sharp · `/clear` between tasks, `/compact <focus>`, rewind summarize, subagents for research (→ 6.1), restart after two failed corrections; ⚠ `/btw` · when to clear, what to compact, polluted context.

**3 Постановка задач**
- `task-anatomy`: states goal, limits, done criterion · best practices before/after examples (validateEmail with cases); symptom + place + what "fixed" means for bugs · pick the best-posed task, missing criterion.
- `plan-first`: written (pilot).
- `decomposition`: splits work into verifiable steps · explore → plan → implement → commit; one change per step with its own check; screenshots for UI · order the steps, oversized step.
- `iterations`: corrects course early · Esc, specific feedback, `/rewind`, `/clear` + better prompt after two misses; ⚠ `ultrathink` (only this keyword is recognised) · when to restart, vague vs specific feedback.

**4 Ревью** (needs a `diff` block)
- `read-diff`: reviews an agent diff like a colleague's · read tests first, scope creep, unexplained files; `/code-review` (alias `/review`), `--fix` · spot the problem in a diff.
- `agent-mistakes`: recognises typical failure modes · invented APIs (point to existing patterns), over-eager refactors, weakened tests, partial solutions · match symptom to cause.
- `tests-contract`: uses tests as the contract · failing test first, then fix the code not the test; "implement, test, run, fix" in one prompt; ⚠ `/goal` · which test proves the fix.
- `security-deps`: guards secrets and dependencies · `/security-review`, deny rules for secrets (→ 1.2), hooks as enforcement (→ 5.1), new dependencies need a reason · risky diff choices.
- `delegation-limit`: decides when to write by hand · no doc rule: reasoned guidance (security-critical code, unclear design, tiny edits) — present as experience, not doc fact · delegate or not, by scenario.

**5 Автоматизация**
- `hooks`: enforces rules with hooks · events (`PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`, `SessionStart`, …), config in settings, exit code 2 blocks, `/hooks` · advice vs enforcement, which event. `code` block for the hook config.
- `commands-skills`: packages repeat work as skills · `.claude/skills/<name>/SKILL.md`, frontmatter (`name`, `description`, `allowed-tools`, `disable-model-invocation`); ⚠ `.claude/commands/` status · skill vs CLAUDE.md vs hook.
- `mcp`: connects external tools safely · `claude mcp add` (http, stdio), scopes local/project/user, `.mcp.json`, `/mcp` · scope choice, trust and permissions.
- `git-flow`: lets the agent commit and open PRs under rules · commits with messages, `gh pr create`, deny push (→ 1.2), worktrees preview (→ 6.2) · what to automate, what to keep.
- `agent-ci`: runs Claude in CI · `/install-github-app`, `anthropics/claude-code-action@v1`, `@claude` mentions, `claude -p`, secrets · safe CI setup choices.

**6 Оркестровка**
- `subagents`: delegates research and review to subagents · `.claude/agents/*.md`, frontmatter (`name`, `description`, `tools`, `model`), built-ins Explore and Plan, separate context · when a subagent helps.
- `worktrees`: runs parallel sessions safely · `claude --worktree <name>` / `-w`, `.claude/worktrees/`, cleanup on exit · conflicts, isolation.
- `agent-roles`: splits writer and reviewer · fresh-context reviewer, tests-writer vs implementer (best practices) · role assignment.
- `agent-sdk`: embeds agents in services · `claude -p`, `--output-format json|stream-json`, `--allowedTools`, `--bare`; SDK packages `@anthropic-ai/claude-agent-sdk`, `claude-agent-sdk` · headless vs SDK.
- `economics`: chooses models and effort with costs in mind · `/model`, `opusplan`, context size, cost in JSON output; ⚠ `/cost`, effort commands · model choice by task.

**★ Выпускной проект** (written, no checks: practice and manual marks)
- `idea-to-pr`: one real task from idea to merged PR using the whole route.
- `before-after`: a personal «Было / Стало» measured on ★.1 against a similar older task (a `compare` block and a template; notes stay in the member's repo, no free-text input).
- `public-profile` («Ваша система работы с агентами»): collects the cycle, the ★.1 PR, the ★.2 comparison and the project's agent setup in `docs/agents.md` for the member and their team. No publishing, no site profile (owner, 2026-10-04).
4. **Библиотека `/library`** (done 2026-10-03: 22 materials, bodies locked by RLS until the step is passed; rules in `.claude/rules/library.md`; starter prompts shared with the landing through `src/features/starter/prompts.ts`). Progress in Профиль done 2026-10-03 (`RouteProgress`: passed steps per stage linking to `/path#stage-…`, opened library materials counted from `library_items` and the progress).
5. **Done (2026-10-04):** landing copy: «Весь маршрут уже внутри» with the real counts (tested against `catalog.ts`), FAQ on what is inside and on «Уже умею», meta descriptions; `landing-core` merged into `members-area`. The capstone's «Было / Стало» uses a `compare` block instead of `RoleShift`; the public profile is dropped (owner decisions above). The guide plan is complete.

## Per iteration
- Lint, build, `npm test -- --project=desktop`, `npm run test:security`; desktop screenshots via `screenshot()` (`tests/helpers/page.ts`).
- New migrations go into `docs/AUTH_SETUP.md`; apply them through Supabase MCP `apply_migration`, then `get_advisors`.
