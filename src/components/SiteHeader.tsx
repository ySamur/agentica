import { useState } from 'react';
import { Link } from 'react-router';
import { Brand, Icon } from './Icon';
import { AccountMenu } from '../features/auth/AccountMenu';

export function SiteHeader({ onStart }: { onStart: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  function start() { setMenuOpen(false); onStart(); }
  return <>
    <a className="skip-link" href="#main">Перейти к содержимому</a>
    <header className="site-header">
      <div className="container header-inner">
        <Brand />
        <nav className={`main-nav ${menuOpen ? 'nav-open' : ''}`} id="main-navigation" aria-label="Главная навигация">
          <Link to="/#why" onClick={() => setMenuOpen(false)}>Почему агенты</Link>
          <Link to="/#how" onClick={() => setMenuOpen(false)}>Как это работает</Link>
          <Link to="/#questions" onClick={() => setMenuOpen(false)}>Вопросы <Icon name="chevron" size={13} /></Link>
          <button className="mobile-start" onClick={start}>Начать с агентами <Icon name="arrow" size={16} /></button>
        </nav>
        <div className="header-actions">
          <button className="header-cta" onClick={start}>Начать с агентами <Icon name="arrowUp" size={17} /></button>
          <AccountMenu />
          <button className="mobile-menu icon-button" aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? 'close' : 'menu'} /></button>
        </div>
      </div>
    </header>
  </>;
}
