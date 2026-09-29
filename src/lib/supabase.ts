import type { SupabaseClient } from '@supabase/supabase-js';

export type MemberContent = { slug: string; body: string };
type Database = {
  public: {
    Tables: {
      member_content: {
        Row: MemberContent;
        Insert: MemberContent;
        Update: Partial<MemberContent>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};

const callbackUrl = new URL(window.location.href);
const callbackHash = new URLSearchParams(callbackUrl.hash.slice(1));
// Capture before the SDK removes the single-use OAuth code from the URL.
export const callbackAttempt = {
  hasCode: callbackUrl.searchParams.has('code'),
  error: callbackUrl.searchParams.get('error') || callbackHash.get('error'),
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
