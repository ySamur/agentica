import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useLocation, useNavigate } from 'react-router';
import { getSupabase, supabaseConfigured } from '../../lib/supabase';
import { clearDestination, rememberDestination } from './redirect';

export type AppUser = { id: string; email: string; displayName: string; avatarUrl: string | null };
type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  signingOut: boolean;
  configured: boolean;
  error: string | null;
  signIn: (destination: string) => Promise<void>;
  signOut: (returnHome?: boolean) => Promise<void>;
  updateName: (name: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function nonEmpty(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function mapUser(user: User): AppUser {
  const metadata = user.user_metadata;
  const avatar = nonEmpty(metadata.avatar_url) || nonEmpty(metadata.picture);
  return {
    id: user.id,
    email: user.email || '',
    displayName: nonEmpty(metadata.display_name) || nonEmpty(metadata.full_name) || nonEmpty(metadata.name) || 'Пользователь',
    avatarUrl: avatar?.startsWith('https://') ? avatar : null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Router navigation is a transition. Keep the route guard paused until the
    // landing has actually committed, rather than racing it with /login.
    if (location.pathname === '/' && !session && signingOut) setSigningOut(false);
  }, [location.pathname, session, signingOut]);

  useEffect(() => {
    const pending = getSupabase();
    if (!pending) return;
    let active = true;
    let revision = 0;
    let unsubscribe = () => {};

    async function restore() {
      try {
        const client = await pending!;
        if (!active) return;
        const { data: { subscription } } = client.auth.onAuthStateChange((event, nextSession) => {
          if (!active) return;
          revision += 1;
          setSession(nextSession);
          if (event === 'SIGNED_OUT') clearDestination();
        });
        unsubscribe = () => subscription.unsubscribe();
        const initialized = await client.auth.initialize();
        if (initialized.error) throw initialized.error;
        const currentRevision = revision;
        const result = await client.auth.getSession();
        if (result.error) throw result.error;
        if (active && currentRevision === revision) setSession(result.data.session);
      } catch {
        if (active) setError('Не удалось восстановить сессию. Попробуйте войти снова.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void restore();
    return () => { active = false; unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session?.expires_at) return;
    // Hide protected UI if refresh is impossible (for example, while offline).
    const remaining = session.expires_at * 1000 - Date.now();
    const timer = window.setTimeout(() => setSession(null), Math.max(0, remaining));
    return () => window.clearTimeout(timer);
  }, [session]);

  const signIn = useCallback(async (destination: string) => {
    const pending = getSupabase();
    if (!pending) throw new Error('Вход временно недоступен. Попробуйте позже.');
    setError(null);
    try {
      rememberDestination(destination);
      const client = await pending;
      const { error: signInError } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'openid email profile',
          queryParams: { prompt: 'select_account' },
        },
      });
      if (signInError) throw signInError;
    } catch {
      throw new Error('Не удалось начать вход. Проверьте соединение и разрешите хранение данных сайта.');
    }
  }, []);

  const signOut = useCallback(async (returnHome = false) => {
    const pending = getSupabase();
    if (!pending) return;
    setSigningOut(true);
    try {
      const client = await pending;
      const { error: signOutError } = await client.auth.signOut({ scope: 'local' });
      setSession(null);
      clearDestination();
      setError(signOutError ? 'Вы вышли на этом устройстве. Сервер недоступен: завершение удалённой сессии не подтверждено.' : null);
      if (returnHome) navigate('/', { replace: true });
    } catch (cause) {
      setSigningOut(false);
      throw cause;
    } finally {
      if (!returnHome) setSigningOut(false);
    }
  }, [navigate]);

  const hasSession = Boolean(session);
  const updateName = useCallback(async (value: string) => {
    const pending = getSupabase();
    if (!pending || !hasSession) throw new Error('Сессия завершена. Войдите снова.');
    const name = value.trim();
    if (!name) throw new Error('Введите имя.');
    const client = await pending;
    const { error: updateError } = await client.auth.updateUser({ data: { display_name: name } });
    if (updateError) {
      if (updateError.status === 401 || updateError.status === 403) await signOut();
      throw new Error('Не удалось сохранить имя. Проверьте соединение и попробуйте ещё раз.');
    }
    // USER_UPDATED updates the session through the subscription, including other tabs.
  }, [hasSession, signOut]);

  // Stable identities keep consumers and their effects from re-running on unrelated renders.
  const sessionUser = session?.user;
  const user = useMemo(() => sessionUser ? mapUser(sessionUser) : null, [sessionUser]);
  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signingOut, configured: supabaseConfigured, error, signIn, signOut, updateName }),
    [user, loading, signingOut, error, signIn, signOut, updateName],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
