---
paths:
  - "src/features/guide/**"
  - "src/pages/path/**"
  - "src/pages/cabinet/**"
  - "src/guide.css"
  - "tests/guide.spec.ts"
  - "content/guide/**"
  - "scripts/guide*"
---

# Маршрут (the route)

- `catalog.ts` is the public map: stages 1–6 and the capstone ★, 31 steps (stage 0 was removed on 2026-10-03; its ids `experience`, `where-now`, `goal`, `playground` stay retired). Step ids are the progress keys: stable, unique across stages, without a stage prefix. Never rename or reuse one; moving a step to another stage keeps its progress.
- `catalog.ts` has no imports: `tests/security.test.mjs` loads it in Node to match the seeded ids.
- A step's lesson is `guide_steps.lesson` (jsonb, members-only, never in the bundle; `null` = not written yet: placeholder plus manual marks). Format: `src/features/guide/lesson/types.ts` — blocks (text, heading, list, callout, command, code, session, compare, diagram), practice, optional check. Inline marks only `code` and **strong**; never HTML. Diagrams are components in `lesson/diagrams/` named in `DiagramName` (`plan-loop`, `permission-modes`, `checkpoints`, `context-window`, `memory-layers`, `step-ladder`); they draw through `useDrawOnView()`. Every block renders as one element (the lesson test counts them). Lesson map and per-step facts: `docs/GUIDE_PLAN.md`.
- Lessons are written in `content/guide/<step-id>.ts` (`LessonSource`, with the answer key and the date the facts were checked against the Claude Code docs) and listed in `content/guide/index.ts`. Publish: `npm run guide:content -- <step-id>` writes a new migration; never edit a generated one. `npm run test:security` fails until the database matches the sources. Questions: 2–4, scenario-based, every option with a `why`.
- Answer keys live in `private.guide_checks` (no grants; the schema is not exposed). `submit_guide_check(step, answers)` grades: wrong → explanations of the chosen options only; all right → every explanation and the step `done`. RLS lets members write only `in_progress` on a step with a check; «Уже умею» there leads to the check.
- Progress is `guide_progress`: own rows only (grants + RLS); the server sets `user_id` and `updated_at`. Statuses: `in_progress` (set on opening), `done`, `skipped` («Уже умею», counts as passed).
- RPC `open_guide_step` records the resume point without undoing finished steps. `submitCheck()` in `GuideProgressProvider` confirms the row the check returns (not optimistic).
- `GuideProgressProvider` (mounted in `App`) loads once per member and saves optimistically with rollback. `resumeStep()` (`progress.ts`) picks the latest opened unfinished step, then the first unfinished one, then the capstone.
- A new step needs a catalog entry and a `guide_steps` migration. Roadmap and lesson workflow: `docs/GUIDE_PLAN.md`.
- Member pages animate with CSS and rAF only (`SessionReplay`, diagrams); reduced motion shows them finished.
