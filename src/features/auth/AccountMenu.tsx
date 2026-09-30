import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { Icon } from '../../components/Icon';
import { hasStoredSession } from '../../lib/supabase';
import { useAuth } from './AuthProvider';
import { UserAvatar } from './UserAvatar';

export function AccountMenu() {
  const { user, loading, signOut } = useAuth();
  const { pathname } = useLocation();
  // Without a stored session a visitor is a guest until they sign in, so «Войти» needs no wait;
  // only a session being restored, or a sign-in being completed, shows the loading state.
  const restoring = loading && (hasStoredSession() || pathname === '/auth/callback');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  function close(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    wrapper.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    function dismiss(event: PointerEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  function handleKeys(event: KeyboardEvent) {
    if (event.key === 'Escape') { event.preventDefault(); close(true); return; }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const items = Array.from(wrapper.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') || []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  }

  async function logout() {
    setBusy(true);
    setError('');
    try { await signOut(true); close(); }
    catch { setError('Не удалось выйти. Попробуйте ещё раз.'); }
    finally { setBusy(false); }
  }

  if (restoring) return <span className="auth-loading" role="status">Загрузка…</span>;
  if (!user) return <Link className="login-link" to="/login">Войти <Icon name="arrowUp" size={15} /></Link>;
  // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- delegates arrow keys from the trigger and menu items.
  return <div className="account-menu" ref={wrapper} onKeyDown={handleKeys} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }}>
    <button ref={trigger} className="account-trigger" aria-label="Меню аккаунта" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? 'account-dropdown' : undefined} onClick={() => setOpen(!open)} onKeyDown={event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); event.stopPropagation(); setOpen(true); }
    }}><UserAvatar user={user} /><span className="account-trigger-name">{user.displayName}</span><Icon name="chevron" size={13} /></button>
    {open && <div className="account-dropdown" id="account-dropdown">
      <div className="account-summary"><strong>{user.displayName}</strong><span>{user.email}</span></div>
      <div role="menu" aria-label="Аккаунт">
        <Link role="menuitem" to="/profile" onClick={() => close()}>Профиль <Icon name="target" size={16} /></Link>
        <button role="menuitem" onClick={logout} disabled={busy}>{busy ? 'Выходим…' : 'Выйти'}<Icon name="arrow" size={16} /></button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>}
  </div>;
}
