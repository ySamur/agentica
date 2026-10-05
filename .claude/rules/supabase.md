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
- Edge Functions live in `supabase/functions/<name>/index.ts` (Deno, `npm:` imports; outside `tsconfig`, so read them carefully). They hold what needs the service role (`SUPABASE_SERVICE_ROLE_KEY`, provided by the platform; never in the repo or the browser). Deploy through MCP `deploy_edge_function` with `verify_jwt: false` only when the function checks the caller itself (`auth.getUser(token)`), as `delete-account` does.
- Applying: the agent runs each new file through Supabase MCP `apply_migration` (write access stays on: a test project), or the owner runs it in the SQL Editor. Then `get_advisors` (security, performance).
