import { useEffect, useRef, useState, type KeyboardEvent, type SubmitEvent } from 'react';
import { useAuth, type AppUser } from '../../features/auth/AuthProvider';
import { nbsp } from '../../lib/typography';

// The last card of the profile: deleting the account for good, after typing its email.
export function DeleteAccount({ user }: { user: AppUser }) {
  const { deleteAccount } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const field = useRef<HTMLInputElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  // Focus waits until the field is enabled again, or the form has given way to its button.
  const pendingFocus = useRef<'field' | 'toggle' | null>(null);
  useEffect(() => {
    if (busy || !pendingFocus.current) return;
    (pendingFocus.current === 'field' ? field : toggle).current?.focus();
    pendingFocus.current = null;
  });

  function show(next: boolean) {
    setOpen(next);
    setError('');
    pendingFocus.current = next ? 'field' : 'toggle';
  }

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim();
    setError('');
    if (email.toLowerCase() !== user.email.toLowerCase()) {
      setError(nbsp('Email не совпадает с адресом аккаунта.'));
      pendingFocus.current = 'field';
      return;
    }
    setBusy(true);
    try {
      // On success the session ends and the landing replaces this page.
      await deleteAccount(email);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось удалить аккаунт.');
      pendingFocus.current = 'field';
      setBusy(false);
    }
  }

  function closeOnEscape(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape' && !busy) show(false);
  }

  return <section className="account-card profile-card danger-card" aria-labelledby="delete-title">
    <h2 id="delete-title">Удаление аккаунта</h2>
    <p className="profile-card-note">{nbsp('Удалятся имя, фото, email и весь прогресс по маршруту. Восстановить аккаунт будет нельзя.')}</p>
    {open
      ? <form className="danger-form" onSubmit={submit} noValidate>
        <label htmlFor="delete-email">{nbsp(`Чтобы подтвердить, введите ${user.email}`)}</label>
        <input ref={field} id="delete-email" name="email" type="email" autoComplete="off" spellCheck={false} disabled={busy} aria-invalid={Boolean(error)} aria-describedby="delete-feedback" onKeyDown={closeOnEscape} onChange={() => setError('')} />
        <div className="profile-form-footer">
          <button className="danger-button" type="submit" disabled={busy}>{busy ? 'Удаляем…' : 'Удалить навсегда'}</button>
          <button type="button" className="text-button" onClick={() => show(false)} disabled={busy}>Отмена</button>
          <span id="delete-feedback" className="form-error" role="alert">{error}</span>
        </div>
      </form>
      : <button ref={toggle} type="button" className="ghost-button danger-toggle" onClick={() => show(true)}>Удалить аккаунт</button>}
  </section>;
}
