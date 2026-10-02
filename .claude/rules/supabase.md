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
- Applying: the owner runs the SQL, or the agent through Supabase MCP once the owner allows write access (`read_only=false` in `.mcp.json`, then an MCP reconnect); return to `read_only=true` right after.
