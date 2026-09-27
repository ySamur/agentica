import { useState, type SubmitEvent } from 'react';
import { Link } from 'react-router';
import { Icon } from '../../components/Icon';
import { useAuth } from '../../features/auth/AuthProvider';
import { UserAvatar } from '../../features/auth/UserAvatar';

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
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось сохранить изменения.'); }
    finally { setBusy(false); }
  }

  return <main id="main" className="account-page container settings-page">
    <div className="page-heading"><span className="section-eyebrow"><span className="small-square" /> ВАШ АККАУНТ</span><h1>Настройки<span className="muted-heading">.</span></h1><p>Ваш профиль и то, как вас видят на сайте.</p></div>
    <div className="settings-grid">
      <nav className="settings-nav" aria-label="Настройки"><Link to="/settings/profile" aria-current="page"><Icon name="target" size={18} />Профиль</Link><Link to="/content"><Icon name="layers" size={18} />Контент<Icon name="arrowUp" size={14} /></Link></nav>
      <section className="account-card profile-card">
        <div className="profile-card-heading"><div><h2>Личный профиль</h2><p>Немного о вас — для больших идей.</p></div><Icon name="spark" size={25} /></div>
        <div className="profile-identity"><UserAvatar user={user} large /><div><strong>{user.displayName}</strong><span>Аккаунт Google</span></div><span className="connected-label"><span className="live-dot" /> Подключён</span></div>
        <form onSubmit={save} noValidate>
          <label htmlFor="profile-name">Имя на сайте</label>
          <input id="profile-name" name="displayName" autoComplete="name" value={name} disabled={busy} aria-invalid={Boolean(error)} aria-describedby="name-help profile-feedback" onChange={event => { setDraft(event.target.value); setError(''); setSaved(false); }} />
          <p className="field-help" id="name-help">Изменится только в agentica. Имя в Google останется прежним.</p>
          <label htmlFor="profile-email">Email</label>
          <input id="profile-email" type="email" value={user.email} readOnly aria-describedby="email-help" />
          <p className="field-help" id="email-help">Адрес и фотография связаны с вашим Google-аккаунтом.</p>
          <div className="profile-form-footer"><button className="button button-dark" type="submit" disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить'}<Icon name="check" size={17} /></button><span id="profile-feedback" className={error ? 'form-error' : 'form-success'} role={error ? 'alert' : 'status'}>{error || (saved ? 'Имя сохранено' : '')}</span></div>
        </form>
      </section>
    </div>
  </main>;
}
