import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { Brand, Icon } from './Icon';
import { AccountMenu } from '../features/auth/AccountMenu';
import { preloadLogin, signUpPath } from '../features/auth/signup';
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

// Guests get the landing's sections and one way in; members get their workspace.
export function SiteHeader({ member }: { member: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const closeMenu = () => setMenuOpen(false);
  // The sign-in page is where this call to action leads, so it goes without one.
  const signUp = pathname !== '/login';
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
            {/* Named after the sections they lead to; the one being read is marked by the landing's motion layer. */}
            <Link to="/#why" onClick={closeMenu}>Роль</Link>
            <Link to="/#skills" onClick={closeMenu}>Навыки</Link>
            <Link to="/#how" onClick={closeMenu}>Путь</Link>
            <Link to="/#questions" onClick={closeMenu}>Вопросы</Link>
            {signUp && <Link className="mobile-start" to={signUpPath} onClick={closeMenu} onPointerEnter={preloadLogin} onFocus={preloadLogin}>Начать бесплатно <Icon name="arrow" size={16} /></Link>}
          </>}
        </nav>
        <div className="header-actions">
          {member ? <ContinueLink /> : signUp && <Link className="header-cta" to={signUpPath} onPointerEnter={preloadLogin} onFocus={preloadLogin}>Начать бесплатно <Icon name="arrowUp" size={17} /></Link>}
          <AccountMenu />
          <button className="mobile-menu icon-button" aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? 'close' : 'menu'} /></button>
        </div>
      </div>
    </header>
  </>;
}
