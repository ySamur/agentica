# Guide (Маршрут)

The members' route as a guide from hand-written code to orchestrating agents. Readers are experienced developers: no fluff, no forced order, proof over promises.

**Status (2026-10-04): complete.** 31 lessons (stages 1–6 and the capstone ★), checks graded on the server, the «Этап пройден» card, the library `/library` (`.claude/rules/library.md`), route progress in Профиль (`src/pages/profile/RouteProgress.tsx`), landing copy with the real counts. Further work is content edits and the site's next stage (CLAUDE.md).

## Owner decisions
- The agent drafts lesson texts from the official Claude Code docs; the owner edits tone and adds examples.
- A step with a check is passed by passing it; «Уже умею» jumps to the check. Steps without one (the capstone) keep manual «Выполнено»/«Уже умею».
- Answers are graded on the server; keys never reach the browser.
- No free-text input anywhere: choices only.
- 2026-10-03: stage 0 «Точка отсчёта» and the onboarding built on it are dropped; the route starts at stage 1.
- 2026-10-04: no public profile and no sharing of progress, now or later. Step ★.3 keeps id `public-profile` but is «Ваша система работы с агентами»: the result is collected in the member's project; showing it is the member's own call.
- Role wording: «Разработчик-оркестратор» / «Разработчик, который управляет агентами».
- Larger work goes one visible iteration at a time: desktop screenshots, then the owner's go-ahead.

## Lesson anatomy (10–15 min)
1. Outcome: one line, what the member can do after the step.
2. Teaching blocks: short text between visuals: `session` (scripted Claude Code session), `compare` (before/after prompt or file), `diff` (with reviewer marks), `diagram`, `callout` (`trap`, `tip`), `command` and `code` (copyable).
   New format (owner, 2026-10-07): pilot 3.2 approved, rolled out to stages 1–6; other stages one at a time, each shown before it is published. Blocks: `scene` (an opening scene, may be fiction), `bridge` («Вы это уже умеете»: a practice the reader knows), `why` (the mechanism in 2–4 sentences), `spot` (a trainer: pick the item not to approve; checked in the browser, never recorded) and `sources` (code.claude.com pages; the text itself stops saying «документация говорит»). No «Как это сделано здесь» block. Trainer reveals and asides stay within what the reader has met so far: no pointers to later steps («шаг 1.4»), no warnings about stakes the route hasn't reached yet; they prepare for what comes next instead (owner, 2026-10-07). Reading `minutes` only; keep `catalog.ts` in step.
3. Practice: one task in the member's own project, plus a «Готово, если» list.
4. Check: 2–4 scenario questions ("the agent proposes X; what do you do?"), not trivia. Wrong options are plausible mistakes, as specific and about as long as the right one (it is never more than ~15% longer; options are shuffled per member). Every option has a `why`; the right one starts with «Да.». The capstone has none.

Format and security rules: `.claude/rules/guide.md`.

## Editing content
1. Facts: check each against code.claude.com (the `claude-code-guide` agent); cite the pages in the source's header comment and set `verified` and `claudeCode` (the release in the CHANGELOG that day). Leave out what the docs don't confirm.
2. Edit `content/guide/<step-id>.ts` or `content/library/<stage>.ts`.
3. `npm run guide:content -- <step-id>` or `npm run library:content` writes a new migration; add it to `docs/AUTH_SETUP.md`.
4. Lint, build, `npm test -- --project=desktop`, `npm run test:security` (fails until the database matches the sources).
5. Apply through Supabase MCP `apply_migration`, one file at a time; compare md5 of the rows with a local PGlite build; `get_advisors`.

## Lesson map
One line per step: outcome · key facts · check themes · links. Stages build on each other: refer back instead of repeating. The source's header comment and `verified` date record what was checked.

**1 Первый контакт**
- `install`: installed, signed in, first questions · native installer, no `sudo npm` (npm needs Node 22+), accounts (Pro/Max, Team/Enterprise, Console, cloud providers; no free plan), `claude -c/-r`, `/init`, `claude doctor` · where to run, resume, sudo.
- `permissions`: knows what runs without asking; sets project rules · `auto` is the starting mode (v2.1.283+), falls back to Manual (`default` in settings); Shift+Tab cycle; "don't ask again": commands and domains per repo, file edits per session; deny → ask → allow; `.claude/settings.json` vs `.local` · deny wins, auto start, mode for exploring, deny list.
- `explore-code`: uses the agent as a researcher, verifies answers · `@` files and folders; ask for files and functions; ask about absence · precise question, confident answer, known file.
- `first-edit`: small edit with a criterion; reads diffs; declines with feedback · Esc, queued messages, `acceptEdits`, give a pass/fail check · criterion, wrong file, green tests.
- `checkpoints`: rewinds safely, knows the limits · Esc Esc, `/rewind` options, not tracked: commands, manual and subagent edits; ~30 days · rm vs files, restore code only, why git.

**2 Контекст**
- `project-view`: knows what fills the context and how to look · context window (1M on current models, 200K on older ones and some cloud providers); loaded at start (system prompt, CLAUDE.md, auto memory, git status); `/context`; auto-compaction · what the agent sees on start, why answers degrade late in a session.
- `claude-md`: writes a short, useful CLAUDE.md · locations (`~/.claude/CLAUDE.md`, `./CLAUDE.md`, `CLAUDE.local.md`, subfolder files on demand), `@path` imports, `.claude/rules/` with `paths`, `/init`, `/memory` · what belongs, where to put a personal preference, a 300-line file.
- `conventions`: puts commands, style and checks where the agent obeys them · what to include / leave out, "would removing this cause mistakes?", verification commands; CLAUDE.md is advice, hooks enforce (→ 5.1) · which line to cut, rule vs hook.
- `clean-context`: keeps long sessions sharp · `/clear` between tasks, `/compact <focus>`, rewind summarize, `/btw`, subagents for research (→ 6.1), restart after two failed corrections · when to clear, what to compact, polluted context.

**3 Постановка задач**
- `task-anatomy`: states goal, limits, done criterion · before/after examples (validateEmail with cases); symptom + place + what "fixed" means for bugs · pick the best-posed task, missing criterion.
- `plan-first`: plans before code (the pilot) · plan mode, editing the plan, approving · when to plan, what to read in a plan.
- `decomposition`: splits work into verifiable steps · explore → plan → implement → commit; one change per step with its own check; screenshots for UI · order the steps, oversized step.
- `iterations`: corrects course early · Esc, specific feedback, `/rewind`, `/clear` + better prompt after two misses, `ultrathink` vs `/effort` (`low`…`max` with `xhigh`, saved per model) · when to restart, vague vs specific feedback.

**4 Ревью**
- `read-diff`: reviews an agent diff like a colleague's · files and tests first, scope creep; `/diff`, `/code-review` (`--fix`, `--comment`) · spot the problem in a diff.
- `agent-mistakes`: recognises typical failure modes · invented APIs (point to existing patterns), over-eager refactors, weakened tests, partial solutions · match symptom to cause.
- `tests-contract`: uses tests as the contract · failing test first, then fix the code not the test; "implement, test, run, fix" in one prompt · which test proves the fix.
- `security-deps`: guards secrets and dependencies · `/security-review`, deny rules for secrets (→ 1.2), hooks as enforcement (→ 5.1), new dependencies need a reason · risky diff choices.
- `delegation-limit`: decides when to write by hand · no doc rule: reasoned guidance (security-critical code, unclear design, tiny edits), presented as experience · delegate or not, by scenario.

**5 Автоматизация**
- `hooks`: enforces rules with hooks · events (`PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`, `SessionStart`, …), config in settings, exit code 2 blocks, `/hooks` · advice vs enforcement, which event.
- `commands-skills`: packages repeat work as skills · `.claude/skills/<name>/SKILL.md`, frontmatter (`name`, `description`, `allowed-tools`, `disable-model-invocation`), `.claude/commands/` · skill vs CLAUDE.md vs hook.
- `mcp`: connects external tools safely · `claude mcp add` (http, stdio), scopes local/project/user, `.mcp.json`, `/mcp` · scope choice, trust and permissions.
- `git-flow`: lets the agent commit and open PRs under rules · commits with messages, `gh pr create`, deny push (→ 1.2), worktrees preview (→ 6.2) · what to automate, what to keep.
- `agent-ci`: runs Claude in CI · `/install-github-app` (needs `gh`, github.com only), `anthropics/claude-code-action@v1`, `@claude` mentions, `claude -p --bare`, secrets · safe CI setup choices.

**6 Оркестровка**
- `subagents`: delegates research and review to subagents · `.claude/agents/*.md`, frontmatter (`name`, `description`, `tools`, `model`), built-ins Explore, Plan, general-purpose, separate context, background by default · when a subagent helps.
- `worktrees`: runs parallel sessions safely · `claude --worktree <name>` / `-w`, `.claude/worktrees/`, branch `worktree-<name>`, cleanup on exit (clean unnamed ones; named ones ask), `.worktreeinclude` (ignored files only) · conflicts, isolation.
- `agent-roles`: splits researcher, writer and reviewer · fresh-context reviewer, tests-writer vs implementer, competing hypotheses · role assignment.
- `agent-sdk`: embeds agents in services · `claude -p`, `--output-format json|stream-json`, `--allowedTools`, `--permission-mode`; `@anthropic-ai/claude-agent-sdk`, `claude-agent-sdk`, `query()` · headless vs SDK, read-only limits.
- `economics`: chooses models and effort with costs in mind · `/model`, `opusplan`, `/effort`, `/usage` (`/cost` and `/stats` are aliases; subscribers see plan limits, API users dollars), automatic prompt caching, `total_cost_usd` · model choice by task.

**★ Выпускной проект** (no checks: practice and manual marks)
- `idea-to-pr`: one real task from idea to merged PR using the whole route.
- `before-after`: a personal «Было / Стало» measured on ★.1 against a similar older task (a `compare` block and a template; notes stay in the member's repo).
- `public-profile` («Ваша система работы с агентами»): collects the cycle, the ★.1 PR, the ★.2 comparison and the project's agent setup in `docs/agents.md` for the member and their team. No publishing.
