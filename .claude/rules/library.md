---
paths:
  - "src/pages/library/**"
  - "src/features/library/**"
  - "content/library/**"
  - "scripts/library*"
  - "tests/library.spec.ts"
---

# Библиотека (the library)

- `/library`: materials members take with them (`prompt`, `template`, `checklist`), grouped by stage. Every title is listed; a body opens once its step is `done` or `skipped`, so a locked material links to that step.
- The lock is RLS, not the UI: `library_items` (titles) is readable by every non-anonymous member; `library_bodies` only through a passed `guide_progress` row of the member. Both are select-only for `authenticated`.
- Materials are written in `content/library/<stage>.ts` (`LibrarySource`) and listed in route order in `content/library/index.ts`. Build them on facts the step's lesson already verified; a `prompt` has no `file`, other kinds need one.
- Publish: `npm run library:content` writes one migration that syncs the whole library (upserts, removes dropped ids); never edit a generated one. `npm run test:security` fails until the database matches the sources.
- The starter prompts have one source, `src/features/starter/prompts.ts`: the landing's dialog and the library both read it.
