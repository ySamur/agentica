import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { useLocation, useNavigate } from 'react-router';
import { callbackAttempt, getSupabase, hasStoredSession, supabaseConfigured } from '../../lib/supabase';
import { clearDestination, clearLetterDestination, rememberDestination, rememberLetterDestination } from './redirect';

export type AppUser = { id: string; email: string; displayName: string; avatarUrl: string | null; viaGoogle: boolean };
// `confirm`: the email is not confirmed yet, so the session starts from the letter's link.
export type PasswordResult = 'signed-in' | 'confirm';
type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  signingOut: boolean;
  configured: boolean;
  error: string | null;
  signIn: (destination: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<PasswordResult>;
  signUp: (email: string, password: string, name: string, destination: string) => Promise<PasswordResult>;
  resendConfirmation: (email: string, destination: string) => Promise<void>;
  signOut: (returnHome?: boolean) => Promise<void>;
  updateName: (name: string) => Promise<void>;
};

export const minPasswordLength = 8;
const unavailable = 'Вход временно недоступен. Попробуйте позже.';
const offline = 'Не удалось войти. Проверьте соединение и попробуйте ещё раз.';
const confirmRedirect = () => `${window.location.origin}/auth/callback`;
// With confirmations on, GoTrue answers 500 `unexpected_failure` when the letter cannot be sent (SMTP).
const letterFailed = (error: AuthError) => error.status === 500
  ? 'Не удалось отправить письмо с подтверждением. Попробуйте позже.'
  : passwordError(error);

// Supabase Auth error codes → what the person can do about them.
function passwordError(error: AuthError) {
  switch (error.code) {
    case 'invalid_credentials': return 'Неверный email или пароль.';
    case 'user_already_exists':
    case 'email_exists': return 'Этот email уже зарегистрирован. Войдите паролем или через Google.';
    case 'weak_password': return `Пароль слишком простой: минимум ${minPasswordLength} символов, лучше с буквами и цифрами.`;
    case 'email_address_invalid':
    case 'validation_failed': return 'Проверьте email: похоже, в адресе опечатка.';
    case 'email_not_confirmed': return 'Подтвердите email по ссылке из письма, затем войдите.';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit': return 'Слишком много попыток. Подождите минуту и попробуйте снова.';
    case 'email_provider_disabled':
    case 'signup_disabled': return 'Вход по email сейчас выключен. Войдите через Google.';
    // The SDK turns 5xx answers into retryable errors without a code; status 0 is no connection.
    default: return (error.status ?? 0) >= 500 ? 'Сервис входа сейчас не отвечает. Попробуйте позже.' : offline;
  }
}

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
    viaGoogle: Array.isArray(user.app_metadata.providers) ? user.app_metadata.providers.includes('google') : user.app_metadata.provider === 'google',
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

    const restore = async () => {
      try {
        const client = await pending;
        if (!active) return;
        const { data: { subscription } } = client.auth.onAuthStateChange((event, nextSession) => {
          if (!active) return;
          revision += 1;
          setSession(nextSession);
          if (event === 'SIGNED_OUT') { clearDestination(); clearLetterDestination(); }
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
    };
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
    if (!pending) throw new Error(unavailable);
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

  // The new session arrives through onAuthStateChange; the login page then leaves for its destination.
  const signInWithPassword = useCallback(async (email: string, password: string): Promise<PasswordResult> => {
    const pending = getSupabase();
    if (!pending) throw new Error(unavailable);
    setError(null);
    let failure: AuthError | null;
    try {
      const client = await pending;
      ({ error: failure } = await client.auth.signInWithPassword({ email: email.trim(), password }));
    } catch {
      throw new Error(offline);
    }
    if (failure?.code === 'email_not_confirmed') return 'confirm';
    if (failure) throw new Error(passwordError(failure));
    return 'signed-in';
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string, destination: string): Promise<PasswordResult> => {
    const pending = getSupabase();
    if (!pending) throw new Error(unavailable);
    setError(null);
    let result;
    try {
      // With email confirmation on, the letter's link returns through /auth/callback to this destination.
      rememberLetterDestination(destination);
      const client = await pending;
      result = await client.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: name.trim() }, emailRedirectTo: confirmRedirect() },
      });
    } catch {
      throw new Error('Не удалось создать аккаунт. Проверьте соединение и разрешите хранение данных сайта.');
    }
    if (result.error) throw new Error(letterFailed(result.error));
    return result.data.session ? 'signed-in' : 'confirm';
  }, []);

  const resendConfirmation = useCallback(async (email: string, destination: string) => {
    const pending = getSupabase();
    if (!pending) throw new Error(unavailable);
    let failure: AuthError | null;
    try {
      rememberLetterDestination(destination);
      const client = await pending;
      ({ error: failure } = await client.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: confirmRedirect() } }));
    } catch {
      throw new Error('Не удалось отправить письмо. Проверьте соединение и попробуйте ещё раз.');
    }
    if (failure) throw new Error(letterFailed(failure));
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
    () => ({ user, loading, signingOut, configured: supabaseConfigured, error, signIn, signInWithPassword, signUp, resendConfirmation, signOut, updateName }),
    [user, loading, signingOut, error, signIn, signInWithPassword, signUp, resendConfirmation, signOut, updateName],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

// A session on its way while the SDK loads: one stored by an earlier visit, or a sign-in being
// completed with an OAuth code. The header, the pages and the account menu all treat it as a member.
export function useSessionPending() {
  return useAuth().loading && (hasStoredSession() || callbackAttempt.hasCode);
}
