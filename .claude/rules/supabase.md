---
paths:
  - "supabase/**"
  - "tests/security.test.mjs"
  - "docs/AUTH_SETUP.md"
---

# Supabase migrations

- Every change is a new file in `supabase/migrations/`; files apply once, in name order.
- Grant only to `authenticated`, enable RLS on every table, and make policies reject anonymous sessions (`is_anonymous`).
- After a change, run `npm run test:security`: it applies every migration to PGlite and checks grants and RLS as the browser roles. Extend it for new tables and functions.
- Add each new migration to the list in `docs/AUTH_SETUP.md`.
- Applying: the agent runs each new file through Supabase MCP `apply_migration` (write access stays on: a test project), or the owner runs it in the SQL Editor. Then `get_advisors` (security, performance).
