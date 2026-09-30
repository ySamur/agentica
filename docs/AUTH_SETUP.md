# Auth setup (owner-run, agent-guided)

The owner does these steps in their own accounts; never handle their secrets. Until done, the landing works and login reports «Вход временно недоступен».

1. **Supabase** project `agentica`: copy Project URL and Publishable key (`sb_publishable_…`), never Secret/`service_role`. Allow new sign-ups; disable anonymous and unused providers. Email provider: on, Confirm email on (unconfirmed addresses would let someone pre-register another person's Gmail that a later Google sign-in links into), minimum password length 8 (`minPasswordLength`). Custom SMTP (Authentication → Emails → SMTP; owner enters the provider's credentials, never share them): built-in mail reaches only org members' addresses, a few per hour, so it only suits testing. After SMTP, raise the email rate limit (Authentication → Rate Limits). The Confirm signup template keeps `{{ .ConfirmationURL }}`; translate its text to Russian. Note the Google callback `https://<ref>.supabase.co/auth/v1/callback`.
2. **Google Cloud** project `agentica` → Google Auth Platform. Branding: app name, support and contact email. Audience: External (in Testing mode add test users; public use needs Google verification). Data Access: only `openid`, `userinfo.email`, `userinfo.profile`. Client: Web application; JS origins `http://localhost:3000`, `http://localhost:3001` (plus any other local port); redirect URI is the Supabase callback. Client ID and Secret go only into Supabase's Google provider; enable it.
3. **Supabase URL Configuration**: Site URL `http://localhost:3000`; Redirect URLs `http://localhost:*/auth/callback` (dev only; production needs HTTPS and exact URLs). Flow: site → Supabase → Google → Supabase callback → `/auth/callback`. Open the site via `localhost`, not a LAN IP.
4. **Migrations**: apply each file in `supabase/migrations/` once, in name order (SQL Editor, or `apply_migration` through Supabase MCP with write access, then back to `read_only=true`):
   - `202609240001_member_content.sql`: legacy test table, dropped by `…0003`.
   - `202609290001_guide.sql`: `guide_steps` (35 step texts, members read), `guide_progress` (own rows only; `user_id`/`updated_at` set by the server), RPC `open_guide_step`; grants + RLS.
   - `202609290002_guide_progress_step_index.sql`: index for the `step_id` foreign key.
   - `202609290003_drop_member_content.sql`.
   - `202609300001_revoke_rls_auto_enable.sql`: browser roles lose EXECUTE on Supabase's auto-RLS `rls_auto_enable()` (Advisor 0028/0029); no-op without it. Advisor «Leaked Password Protection» stays: Pro-plan setting.
   The site name lives in `user_metadata.display_name`; no profiles table.
5. **`.env.local`**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`; restart the dev server.

## Manual acceptance (automated tests use fixtures only)
- Guest `/path/tasks/plan-first` shows login without the step text; Google sign-in returns to that step with its text.
- Opening a step marks it «В процессе»; «Выполнено» and «Уже умею» survive a reload and another browser; «Продолжить» leads to the last opened unfinished step.
- Email sign-up (name, email, password) shows «Отправили письмо…»; the letter's link in the same browser lands on the page asked for; in another browser it says to sign in with the password, which then works. Sign-in before confirming offers «Отправить письмо ещё раз». A wrong password says «Неверный email или пароль»; the profile shows «Email и пароль».
- A profile name change survives reload and appears in the account menu.
- Logout in one tab hides the menu and the route in all tabs; re-login keeps one account, the name and the progress.
- Cancelled consent offers a retry. OAuth works on ports 3000 and 3001.
- `curl "https://<ref>.supabase.co/rest/v1/guide_steps?select=step_id" -H "apikey: <publishable-key>"` is denied, as is `guide_progress`. A signed-in request (DevTools → Copy as fetch) returns the texts and only that account's progress; without `Authorization` it does not. Never store the token.

## Troubleshooting
- «Вход временно недоступен»: both vars set, key type, Vite restarted.
- Sign-up 500 `unexpected_failure` or no letter: Auth logs (`query_logs`, source `auth_logs`) show the SMTP reply. Brevo: `535` = Username must be the SMTP Login and Password the SMTP key (`xsmtpsib-`); `525 Unauthorized IP` = deactivate Authorized IPs (Supabase has no fixed IP). Brevo logs «Sent» then «Error» = the receiving provider (seen with ukr.net) refused a sender on an unauthenticated domain; use a sender on a domain authenticated in Brevo (SPF/DKIM) or Brevo's own `…brevosend.com` address.
- `redirect_uri_mismatch`: Google needs the Supabase callback, not the site URL.
- Returns to the wrong port: check Supabase Redirect URLs; open via `localhost`.
- Sign-in not completed: same browser, no site-data clearing mid-flow (PKCE verifier is in storage).
- «Не удалось загрузить прогресс» or a step text fails after login: `202609290001_guide.sql` applied and `guide_steps` has 35 rows.
