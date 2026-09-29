import { Link } from 'react-router';
import { Icon } from './Icon';

export function PageStatus({ title, message, retry }: { title: string; message?: string; retry?: () => void }) {
  return <main id="main" className="account-page container">
    <section className="account-card status-card" aria-live="polite">
      <span className="account-emblem"><Icon name="shield" size={28} /></span>
      <h1>{title}</h1>
      {message && <p>{message}</p>}
      {retry && <button className="ghost-button" onClick={retry}>Попробовать снова <Icon name="refresh" size={16} /></button>}
      <Link className="text-link" to="/">На главную <Icon name="arrow" size={16} /></Link>
    </section>
  </main>;
}
