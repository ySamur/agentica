---
paths:
  - "src/features/auth/**"
  - "src/pages/auth/**"
  - "src/lib/supabase.ts"
  - "tests/auth.spec.ts"
---

# Auth

- `AuthProvider` (`src/features/auth/AuthProvider.tsx`): `signIn` (Google OAuth), `signInWithPassword`, `signUp`, `resendConfirmation`, `requestPasswordReset`, `updatePassword`, `changeEmail`, `resendEmailChange`, `signOut`, `updateName`. Supabase Auth error codes map to Russian messages in `passwordError()`; a 500 on a letter (SMTP) gets `letterFailed()`.
- The name lives in `user_metadata.display_name`; there is no profiles table.
- `getSupabase()` (`src/lib/supabase.ts`) loads the SDK lazily and returns one shared PKCE client, or `null` when unconfigured. Never create another client: StrictMode must not exchange a code twice.
- Email confirmation is on: sign-up, and sign-in before confirming, return `'confirm'`. The letter's link returns through `/auth/callback`. PKCE signs in only the browser that started the flow; elsewhere the callback says the email is confirmed and to sign in with the password. `otp_expired` gets its own message.
- Password reset: «Забыли пароль?» on `LoginPage` sends `resetPasswordForEmail` (same answer for any address, then a one-minute resend wait). Its link returns through `/auth/callback` too (the only allowed redirect URL); the SDK flags the session with PASSWORD_RECOVERY (`recovering`), announced from a timer, so the callback navigates from a later one to `/password` with `{ next, recovery }` state. `updatePassword` then signs out the account's other sessions (`scope: 'others'`). Email accounts reach `/password` from the profile too.
- Email change (email accounts; Google ones keep Google's address): `EmailChange` in the profile calls `updateUser({ email })`; the address waits in `new_email` (`AppUser.pendingEmail`) until its links are followed. With Secure email change both addresses get a link: the first returns `?message=` without a code (the callback shows its own words, never the URL's), the last one's code exchange returns to `/profile` with the new address.
- `redirect.ts` remembers where to return after sign-in; `safeDestination()` lets through only known pages and route steps. A letter's destination (`rememberLetterDestination`, localStorage) lasts until its callback hands over to a page, so members may browse while a letter is on its way.
- `LoginPage`: Google first, the email form below it.
- Owner-run provider setup and the manual acceptance checks: `docs/AUTH_SETUP.md`.
