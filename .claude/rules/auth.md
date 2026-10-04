---
paths:
  - "src/features/auth/**"
  - "src/pages/auth/**"
  - "src/lib/supabase.ts"
  - "tests/auth.spec.ts"
---

# Auth

- `AuthProvider` (`src/features/auth/AuthProvider.tsx`): `signIn` (Google OAuth), `signInWithPassword`, `signUp`, `resendConfirmation`, `requestPasswordReset`, `updatePassword`, `changeEmail`, `resendEmailChange`, `updateAvatar`, `deleteAccount`, `signOut`, `updateName`. Supabase Auth error codes map to Russian messages in `passwordError()`; a 500 on a letter (SMTP) gets `letterFailed()`.
- The name lives in `user_metadata.display_name`; there is no profiles table.
- Profile photo: `AvatarPicker` crops and re-encodes the file in the browser (`avatarImage`: 256 px square, WebP or PNG, no EXIF) and `updateAvatar` uploads it to the public `avatars` bucket under `<user id>/<new name>`, saves the path as `user_metadata.avatar_path` (not `avatar_url`: Google rewrites that on sign-in), then removes the old file. `mapUser` prefers it to Google's photo; `null` removes it.
- `getSupabase()` (`src/lib/supabase.ts`) loads the SDK lazily and returns one shared PKCE client, or `null` when unconfigured. Never create another client: StrictMode must not exchange a code twice.
- Email confirmation is on: sign-up, and sign-in before confirming, return `'confirm'`. The letter's link returns through `/auth/callback`. PKCE signs in only the browser that started the flow; elsewhere the callback says the email is confirmed and to sign in with the password. `otp_expired` gets its own message.
- Password reset: «Забыли пароль?» on `LoginPage` sends `resetPasswordForEmail` (same answer for any address, then a one-minute resend wait). Its link returns through `/auth/callback` too (the only allowed redirect URL); the SDK flags the session with PASSWORD_RECOVERY (`recovering`), announced from a timer, so the callback navigates from a later one to `/password` with `{ next, recovery }` state. `updatePassword` then signs out the account's other sessions (`scope: 'others'`). Email accounts reach `/password` from the profile too.
- Email change (email accounts; Google ones keep Google's address): `EmailChange` in the profile calls `updateUser({ email })`; the address waits in `new_email` (`AppUser.pendingEmail`) until its links are followed. With Secure email change both addresses get a link: the first returns `?message=` without a code (the callback shows its own words, never the URL's), the last one's code exchange returns to `/profile` with the new address.
- Account deletion: `DeleteAccount` (last profile card) asks for the account's email, `deleteAccount` calls the `delete-account` Edge Function (it re-checks the token and the email, removes the photos, deletes the user; progress cascades), then signs out like «Выйти» and leaves `notice` for the landing.
- `redirect.ts` remembers where to return after sign-in; `safeDestination()` lets through only known pages and route steps. A letter's destination (`rememberLetterDestination`, localStorage) lasts until its callback hands over to a page, so members may browse while a letter is on its way.
- `LoginPage`: Google first, the email form below it.
- Owner-run provider setup and the manual acceptance checks: `docs/AUTH_SETUP.md`.
