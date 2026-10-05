import type { SupabaseClient } from '@supabase/supabase-js';
import type { Answers, CheckResult, Lesson } from '../features/guide/lesson/types';
import type { LibraryBodyRow, LibraryItemRow } from '../features/library/types';

// The route's tables and RPCs (supabase/migrations/*_guide*.sql).
export type GuideProgressRow = { user_id: string; step_id: string; status: 'in_progress' | 'done' | 'skipped'; updated_at: string };
// `lesson` is null until the step's lesson is written.
type GuideStepRow = { step_id: string; lesson: Lesson | null };
type Database = {
  public: {
    Tables: {
      guide_steps: {
        Row: GuideStepRow;
        Insert: GuideStepRow;
        Update: Partial<GuideStepRow>;
        Relationships: [];
      };
      // Read-only for members (supabase/migrations/*_library.sql); bodies only for passed steps.
      library_items: {
        Row: LibraryItemRow;
        Insert: LibraryItemRow;
        Update: Partial<LibraryItemRow>;
        Relationships: [];
      };
      library_bodies: {
        Row: LibraryBodyRow;
        Insert: LibraryBodyRow;
        Update: Partial<LibraryBodyRow>;
        Relationships: [];
      };
      guide_progress: {
        Row: GuideProgressRow;
        // `user_id` and `updated_at` are the server's: auth.uid() and its clock.
        Insert: Pick<GuideProgressRow, 'step_id' | 'status'>;
        Update: Partial<Pick<GuideProgressRow, 'step_id' | 'status'>>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      open_guide_step: { Args: { step: string }; Returns: GuideProgressRow[] };
      submit_guide_check: { Args: { step: string; answers: Answers }; Returns: CheckResult };
    };
  };
};

const callbackUrl = new URL(window.location.href);
const callbackHash = new URLSearchParams(callbackUrl.hash.slice(1));
// Capture before the SDK removes the single-use OAuth code from the URL.
export const callbackAttempt = {
  hasCode: callbackUrl.searchParams.has('code'),
  error: callbackUrl.searchParams.get('error') || callbackHash.get('error'),
  // `otp_expired`: an old or already used letter link.
  errorCode: callbackUrl.searchParams.get('error_code') || callbackHash.get('error_code'),
  // With Secure email change, the first of the two links returns only a message, no code. Its text
  // comes from the URL, so the page shows its own words instead.
  hasMessage: callbackUrl.searchParams.has('message') || callbackHash.has('message'),
};

function getConfiguration() {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key?.startsWith('sb_publishable_')) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
    return { url: parsed.origin, key };
  } catch {
    return null;
  }
}

const configuration = getConfiguration();
export const supabaseConfigured = configuration !== null;

// A profile photo's address in the public `avatars` bucket (supabase/migrations/202610040050_avatars.sql).
export function avatarUrl(path: string) {
  return configuration ? `${configuration.url}/storage/v1/object/public/avatars/${path}` : null;
}

// Passed to the client below, so the synchronous check can never drift from the SDK. It equals
// the SDK's default key, which keeps existing sessions. The check only picks which page to
// show before the SDK loads; access is still enforced by RLS.
const storageKey = configuration && `sb-${new URL(configuration.url).hostname.split('.')[0]}-auth-token`;

export function hasStoredSession() {
  if (!storageKey) return false;
  try {
    return localStorage.getItem(storageKey) !== null;
  } catch {
    return false;
  }
}

let client: Promise<SupabaseClient<Database>> | null = null;

// The SDK is about 40% of the bundle, so it loads after the first render.
// One client per page, outside React: StrictMode must not exchange a code twice.
export function getSupabase() {
  if (!configuration) return null;
  client ??= import('@supabase/supabase-js').then(({ createClient }) => createClient<Database>(configuration.url, configuration.key, {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      storageKey: storageKey ?? undefined,
      autoRefreshToken: true,
      detectSessionInUrl: callbackUrl.pathname === '/auth/callback',
    },
    global: {
      fetch: (input, init) => {
        const timeout = AbortSignal.timeout(12000);
        // AbortSignal.any is missing before Safari 17.4; keep the caller's signal there.
        const signal = !init?.signal ? timeout
          : typeof AbortSignal.any === 'function' ? AbortSignal.any([init.signal, timeout]) : init.signal;
        return fetch(input, { ...init, signal });
      },
    },
  })).catch((cause: unknown) => {
    // Let a later call retry a failed chunk download instead of caching the failure.
    client = null;
    throw cause;
  });
  return client;
}
