---
paths:
  - "src/features/guide/**"
  - "src/pages/path/**"
  - "src/pages/cabinet/**"
  - "src/guide.css"
  - "tests/guide.spec.ts"
---

# Маршрут (the route)

- `catalog.ts` is the public map: 8 stages, 35 steps. Step ids are the progress keys: stable, unique across stages, without a stage prefix. Never rename or reuse one; moving a step to another stage keeps its progress.
- `catalog.ts` has no imports: `tests/security.test.mjs` loads it in Node to match the seeded ids.
- Step texts are members-only rows in `guide_steps` and never ship in the bundle.
- Progress is `guide_progress`: own rows only (grants + RLS); the server sets `user_id` and `updated_at`. Statuses: `in_progress` (set on opening), `done`, `skipped` («Уже умею», counts as passed).
- RPC `open_guide_step` records the resume point without undoing finished steps.
- `GuideProgressProvider` (mounted in `App`) loads once per member and saves optimistically with rollback. `resumeStep()` (`progress.ts`) picks the latest opened unfinished step, then the first unfinished one, then the capstone.
- A new step needs a catalog entry and a `guide_steps` migration.
