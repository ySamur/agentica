# Auth setup (owner-run, agent-guided)

The owner does these steps in their own accounts; never handle their secrets. Until done, the landing works and login reports «Вход временно недоступен».

1. **Supabase** project `agentica`: copy Project URL and Publishable key (`sb_publishable_…`), never Secret/`service_role`. Allow new sign-ups; disable anonymous and unused providers. Note the Google callback `https://<ref>.supabase.co/auth/v1/callback`.
2. **Google Cloud** project `agentica` → Google Auth Platform. Branding: app name, support and contact email. Audience: External (in Testing mode add test users; public use needs Google verification). Data Access: only `openid`, `userinfo.email`, `userinfo.profile`. Client: Web application; JS origins `http://localhost:3000`, `http://localhost:3001` (plus any other local port); redirect URI is the Supabase callback. Client ID and Secret go only into Supabase's Google provider; enable it.
3. **Supabase URL Configuration**: Site URL `http://localhost:3000`; Redirect URLs `http://localhost:*/auth/callback` (dev only; production needs HTTPS and exact URLs). Flow: site → Supabase → Google → Supabase callback → `/auth/callback`. Open the site via `localhost`, not a LAN IP.
4. **SQL Editor**: run `supabase/migrations/202609240001_member_content.sql` once (table, row `slug = 'test'`, grants, RLS). The site name lives in `user_metadata.display_name`; no profiles table.
5. **`.env.local`**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`; restart the dev server.

## Manual acceptance (automated tests use fixtures only)
- Guest `/content` shows login without protected text; Google sign-in returns to `/content` with «тест контент».
- A profile name change survives reload and appears in the account menu.
- Logout in one tab hides the menu and content in all tabs; re-login keeps one account and the name.
- Cancelled consent offers a retry. OAuth works on ports 3000 and 3001.
- `curl "https://<ref>.supabase.co/rest/v1/member_content?select=slug,body" -H "apikey: <publishable-key>"` is denied. A signed-in request (DevTools → Copy as fetch) returns the row; without `Authorization` it does not. Never store the token.

## Troubleshooting
- «Вход временно недоступен»: both vars set, key type, Vite restarted.
- `redirect_uri_mismatch`: Google needs the Supabase callback, not the site URL.
- Returns to the wrong port: check Supabase Redirect URLs; open via `localhost`.
- Sign-in not completed: same browser, no site-data clearing mid-flow (PKCE verifier is in storage).
- Content fails after login: migration applied and row `slug = 'test'` exists.
