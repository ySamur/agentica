---
paths:
  - "src/features/auth/**"
  - "src/pages/auth/**"
  - "src/lib/supabase.ts"
  - "tests/auth.spec.ts"
---

# Auth

- `AuthProvider` (`src/features/auth/AuthProvider.tsx`): `signIn` (Google OAuth), `signInWithPassword`, `signUp`, `resendConfirmation`, `signOut`, `updateName`. Supabase Auth error codes map to Russian messages in `passwordError()`.
- The name lives in `user_metadata.display_name`; there is no profiles table.
- `getSupabase()` (`src/lib/supabase.ts`) loads the SDK lazily and returns one shared PKCE client, or `null` when unconfigured. Never create another client: StrictMode must not exchange a code twice.
- Email confirmation is on: sign-up, and sign-in before confirming, return `'confirm'`. The letter's link returns through `/auth/callback`. PKCE signs in only the browser that started the flow; elsewhere the callback says the email is confirmed and to sign in with the password. `otp_expired` gets its own message.
- `redirect.ts` remembers where to return after sign-in; `safeDestination()` lets through only known pages and route steps.
- `LoginPage`: Google first, the email form below it.
- Owner-run provider setup and the manual acceptance checks: `docs/AUTH_SETUP.md`.
