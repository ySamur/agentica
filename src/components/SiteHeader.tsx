import { useState } from 'react';
import { Link, NavLink } from 'react-router';
import { Brand, Icon } from './Icon';
import { AccountMenu } from '../features/auth/AccountMenu';
import { useGuideProgress } from '../features/guide/GuideProgress';
import { resumeStep, resumeVerb } from '../features/guide/progress';

// Members return to the step they left; before the first one, the route starts from 0.1.
// Until their progress arrives (or if it cannot), it opens the route itself.
function ContinueLink() {
  const { progress, ready } = useGuideProgress();
  if (!ready) return <Link className="header-continue" to="/path">Продолжить <Icon name="arrow" size={15} /></Link>;
  const step = resumeStep(progress);
  const verb = resumeVerb(progress);
  return <Link className="header-continue" to={step.path} aria-label={`${verb}: ${step.label} ${step.title}`}>{verb} <b>{step.label}</b><Icon name="arrow" size={15} /></Link>;
}

// Guests get the landing's sections and ready prompts; members get their workspace.
export function SiteHeader({ member, onStart }: { member: boolean; onStart: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  function start() { closeMenu(); onStart(); }
  return <>
    <a className="skip-link" href="#main">Перейти к содержимому</a>
    <header className="site-header">
      <div className="container header-inner">
        <Brand to={member ? '/' : '/#home'} />
        <nav className={`main-nav ${menuOpen ? 'nav-open' : ''}`} id="main-navigation" aria-label="Главная навигация">
          {member ? <>
            <NavLink to="/" end onClick={closeMenu}>Кабинет</NavLink>
            <NavLink to="/path" onClick={closeMenu}>Маршрут</NavLink>
          </> : <>
            <Link to="/#why" onClick={closeMenu}>Почему агенты</Link>
            <Link to="/#how" onClick={closeMenu}>Как это работает</Link>
            <Link to="/#questions" onClick={closeMenu}>Вопросы <Icon name="chevron" size={13} /></Link>
            <button className="mobile-start" onClick={start}>Начать с агентами <Icon name="arrow" size={16} /></button>
          </>}
        </nav>
        <div className="header-actions">
          {member ? <ContinueLink /> : <button className="header-cta" onClick={start}>Начать с агентами <Icon name="arrowUp" size={17} /></button>}
          <AccountMenu />
          <button className="mobile-menu icon-button" aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? 'close' : 'menu'} /></button>
        </div>
      </div>
    </header>
  </>;
}
