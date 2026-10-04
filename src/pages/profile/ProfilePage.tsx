import { useState, type SubmitEvent } from 'react';
import { Link } from 'react-router';
import { Icon } from '../../components/Icon';
import { useAuth } from '../../features/auth/AuthProvider';
import { UserAvatar } from '../../features/auth/UserAvatar';
import { nbsp } from '../../lib/typography';
import { RouteProgress } from './RouteProgress';

export function ProfilePage() {
  const { user, updateName } = useAuth();
  // null = untouched: follow the account name, including changes from other tabs.
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  if (!user) return null;
  const name = draft ?? user.displayName;

  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaved(false);
    if (!name.trim()) { setError('Введите имя.'); return; }
    setBusy(true);
    try { await updateName(name); setDraft(null); setSaved(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : nbsp('Не удалось сохранить изменения.')); }
    finally { setBusy(false); }
  }

  return <main id="main" className="account-page container">
    <div className="page-heading">
      <span className="story-eyebrow"><i /> Ваш аккаунт</span>
      <h1 tabIndex={-1}>Профиль.</h1>
      <p>{nbsp('Ваш путь по маршруту и данные аккаунта.')}</p>
    </div>
    <div className="profile-layout">
      <RouteProgress />
      <section className="account-card profile-card" aria-labelledby="profile-name-title">
        <h2 id="profile-name-title">Как вас видят</h2>
        <div className="profile-identity"><UserAvatar user={user} large /><div><strong>{user.displayName}</strong><span>{nbsp('Имя и фото в agentica')}</span></div></div>
        <form onSubmit={save} noValidate>
          <label htmlFor="profile-name">{nbsp('Имя на сайте')}</label>
          <input id="profile-name" name="displayName" autoComplete="name" value={name} disabled={busy} aria-invalid={Boolean(error)} aria-describedby="name-help profile-feedback" onChange={event => { setDraft(event.target.value); setError(''); setSaved(false); }} />
          <p className="field-help" id="name-help">{nbsp(user.viaGoogle ? 'Изменится только в agentica. Имя в Google останется прежним.' : 'Так вас видят в agentica.')}</p>
          <div className="profile-form-footer"><button className="glow-button" type="submit" disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить'}<Icon name="check" size={17} /></button><span id="profile-feedback" className={error ? 'form-error' : 'form-success'} role={error ? 'alert' : 'status'}>{error || (saved ? 'Имя сохранено' : '')}</span></div>
        </form>
      </section>
      <section className="account-card profile-card" aria-labelledby="profile-account-title">
        <div className="profile-identity profile-account">
          {user.viaGoogle
            ? <div><h2 id="profile-account-title">Аккаунт Google</h2><p className="profile-card-note">{nbsp('Вход и фотография связаны с вашим Google-аккаунтом.')}</p></div>
            : <div><h2 id="profile-account-title">Email и пароль</h2><p className="profile-card-note">{nbsp('Вы входите по email и паролю.')}</p></div>}
          <span className="connected-label"><i /> Подключён</span>
        </div>
        <label htmlFor="profile-email">Email</label>
        <input id="profile-email" type="email" value={user.email} readOnly aria-describedby="email-help" />
        <p className="field-help" id="email-help">{nbsp(user.viaGoogle ? 'Адрес меняется только в Google.' : 'Адрес пока нельзя изменить.')}</p>
        {!user.viaGoogle && <Link className="ghost-button profile-password" to="/password" state={{ next: '/profile' }}>{nbsp('Сменить пароль')} <Icon name="arrow" size={16} /></Link>}
      </section>
    </div>
  </main>;
}
