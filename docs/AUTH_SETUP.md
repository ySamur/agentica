# Auth setup (owner-run, agent-guided)

The owner does these steps in their own accounts; never handle their secrets. Until done, the landing works and login reports «Вход временно недоступен».

1. **Supabase** project `agentica`: copy Project URL and Publishable key (`sb_publishable_…`), never Secret/`service_role`. Allow new sign-ups; disable anonymous and unused providers. Note the Google callback `https://<ref>.supabase.co/auth/v1/callback`.
2. **Google Cloud** project `agentica` → Google Auth Platform. Branding: app name, support and contact email. Audience: External (in Testing mode add test users; public use needs Google verification). Data Access: only `openid`, `userinfo.email`, `userinfo.profile`. Client: Web application; JS origins `http://localhost:3000`, `http://localhost:3001` (plus any other local port); redirect URI is the Supabase callback. Client ID and Secret go only into Supabase's Google provider; enable it.
3. **Supabase URL Configuration**: Site URL `http://localhost:3000`; Redirect URLs `http://localhost:*/auth/callback` (dev only; production needs HTTPS and exact URLs). Flow: site → Supabase → Google → Supabase callback → `/auth/callback`. Open the site via `localhost`, not a LAN IP.
4. **Migrations**: apply each file in `supabase/migrations/` once, in name order (SQL Editor, or `apply_migration` through Supabase MCP with write access, then back to `read_only=true`):
   - `202609240001_member_content.sql`: legacy test table, dropped by `…0003`.
   - `202609290001_guide.sql`: `guide_steps` (35 step texts, members read), `guide_progress` (own rows only; `user_id`/`updated_at` set by the server), RPC `open_guide_step`; grants + RLS.
   - `202609290002_guide_progress_step_index.sql`: index for the `step_id` foreign key.
   - `202609290003_drop_member_content.sql`.
   The site name lives in `user_metadata.display_name`; no profiles table.
5. **`.env.local`**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`; restart the dev server.

## Manual acceptance (automated tests use fixtures only)
- Guest `/path/tasks/plan-first` shows login without the step text; Google sign-in returns to that step with its text.
- Opening a step marks it «В процессе»; «Выполнено» and «Уже умею» survive a reload and another browser; «Продолжить» leads to the last opened unfinished step.
- A profile name change survives reload and appears in the account menu.
- Logout in one tab hides the menu and the route in all tabs; re-login keeps one account, the name and the progress.
- Cancelled consent offers a retry. OAuth works on ports 3000 and 3001.
- `curl "https://<ref>.supabase.co/rest/v1/guide_steps?select=step_id" -H "apikey: <publishable-key>"` is denied, as is `guide_progress`. A signed-in request (DevTools → Copy as fetch) returns the texts and only that account's progress; without `Authorization` it does not. Never store the token.

## Troubleshooting
- «Вход временно недоступен»: both vars set, key type, Vite restarted.
- `redirect_uri_mismatch`: Google needs the Supabase callback, not the site URL.
- Returns to the wrong port: check Supabase Redirect URLs; open via `localhost`.
- Sign-in not completed: same browser, no site-data clearing mid-flow (PKCE verifier is in storage).
- «Не удалось загрузить прогресс» or a step text fails after login: `202609290001_guide.sql` applied and `guide_steps` has 35 rows.
