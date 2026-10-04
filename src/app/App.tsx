import { lazy, Suspense, useEffect, useRef, useState, ViewTransition } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigationType } from 'react-router';
import { LandingPage } from '../pages/landing/LandingPage';
import { AuthProvider, useAuth, useSessionPending } from '../features/auth/AuthProvider';
import { RequireAuth } from '../features/auth/RequireAuth';
import { clearDestination, clearLetterDestination } from '../features/auth/redirect';
import { stepAtPath } from '../features/guide/catalog';
import { GuideProgressProvider } from '../features/guide/GuideProgress';
import { StarterDialog } from '../features/starter/StarterDialog';
import { SiteHeader } from '../components/SiteHeader';
import { PageStatus } from '../components/PageStatus';
import { useArrivalFocus } from '../lib/arrivalFocus';
import { scrollToTarget } from '../lib/smoothScroll';

export type PageContext = { openStarter: () => void };

// Only the guest landing ships in the main chunk; other pages load on first visit.
const CabinetPage = lazy(() => import('../pages/cabinet/CabinetPage').then(module => ({ default: module.CabinetPage })));
const LoginPage = lazy(() => import('../pages/auth/LoginPage').then(module => ({ default: module.LoginPage })));
const AuthCallbackPage = lazy(() => import('../pages/auth/AuthCallbackPage').then(module => ({ default: module.AuthCallbackPage })));
const ProfilePage = lazy(() => import('../pages/profile/ProfilePage').then(module => ({ default: module.ProfilePage })));
const PasswordPage = lazy(() => import('../pages/auth/PasswordPage').then(module => ({ default: module.PasswordPage })));
const PathPage = lazy(() => import('../pages/path/PathPage').then(module => ({ default: module.PathPage })));
const StepPage = lazy(() => import('../pages/path/StepPage').then(module => ({ default: module.StepPage })));
const LibraryPage = lazy(() => import('../pages/library/LibraryPage').then(module => ({ default: module.LibraryPage })));

const titles: Record<string, string> = {
  '/login': 'Вход',
  '/auth/callback': 'Завершение входа',
  '/profile': 'Профиль',
  '/password': 'Новый пароль',
  '/path': 'Маршрут',
  '/library': 'Библиотека',
};

// `/` is the members' cabinet or the guest landing. Until the SDK restores the session,
// a stored one predicts it, so members never see the landing flash.
function useMember() {
  const { user } = useAuth();
  const pending = useSessionPending();
  return Boolean(user) || pending;
}

function pageTitle(pathname: string, member: boolean) {
  if (pathname === '/') return member ? 'Кабинет' : 'Код пишет Claude. Решения — ваши.';
  const step = stepAtPath(pathname);
  if (step) return `${step.label} ${step.title}`;
  return titles[pathname] || 'Страница не найдена';
}

// Lazy pages mount after navigation, so wait briefly for the anchor to appear.
function scrollToAnchor(id: string, immediate: boolean) {
  const target = document.getElementById(id);
  if (target) {
    scrollToTarget(target, immediate);
    return () => {};
  }
  const observer = new MutationObserver(() => {
    const found = document.getElementById(id);
    if (!found) return;
    stop();
    scrollToTarget(found, immediate);
  });
  const timer = window.setTimeout(() => stop(), 5000);
  function stop() {
    observer.disconnect();
    window.clearTimeout(timer);
  }
  observer.observe(document.body, { childList: true, subtree: true });
  return stop;
}

function Layout() {
  const [starterOpen, setStarterOpen] = useState(false);
  const location = useLocation();
  const navigationType = useNavigationType();
  const { error, user } = useAuth();
  const member = useMember();
  const openStarter = () => setStarterOpen(true);
  const title = pageTitle(location.pathname, member);
  useArrivalFocus(location.pathname, location.hash);

  useEffect(() => {
    document.title = `agentica — ${title}`;
  }, [title]);

  // A letter's destination is spent once its callback hands over to a page. Members asking for an
  // email change keep browsing meanwhile, so merely being signed in must not spend it.
  const previousPath = useRef(location.pathname);
  useEffect(() => {
    if (previousPath.current === '/auth/callback' && location.pathname !== '/auth/callback') clearLetterDestination();
    previousPath.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (!['/login', '/auth/callback'].includes(location.pathname)) clearDestination();
    let stopWaiting = () => {};
    // Loading or going back to an anchor jumps straight to it; following a link glides there.
    const immediate = navigationType === 'POP';
    const frame = requestAnimationFrame(() => {
      if (location.hash) stopWaiting = scrollToAnchor(location.hash.slice(1), immediate);
      else window.scrollTo({ top: 0, behavior: 'instant' });
    });
    return () => { cancelAnimationFrame(frame); stopWaiting(); };
    // Every navigation gets a new key, so following the same anchor link again scrolls again.
  }, [location.pathname, location.hash, location.key, navigationType]);

  return <>
    {/* Work pages share one calm backdrop; the landing draws its own. It stays out of the header's `+` selectors. */}
    <div className="aurora aurora-calm" aria-hidden="true"><i /><i /><i /><i /></div>
    {/* Remounting per route resets the mobile and account menus after any navigation. */}
    <SiteHeader key={location.pathname} member={member} />
    {error && !user && location.pathname === '/' && <p className="auth-notice container" role="status">{error}</p>}
    {/* Router updates run as transitions, so each new page cross-fades in; a hash change on the same
        page is an update and stays still. Suspense sits outside, so a lazy page keeps the old one on
        screen until it is ready instead of flashing the fallback. */}
    <Suspense fallback={<PageStatus title="Загружаем страницу…" />}>
      <ViewTransition key={location.pathname} update="none">
        <Outlet context={{ openStarter } satisfies PageContext} />
      </ViewTransition>
    </Suspense>
    <StarterDialog open={starterOpen} onClose={() => setStarterOpen(false)} />
  </>;
}

// One address per page: `/path/x/y/` becomes `/path/x/y`, so titles, sign-in returns and the
// progress all see the address the catalog knows.
function Root() {
  const location = useLocation();
  if (location.pathname.length > 1 && location.pathname.endsWith('/')) {
    return <Navigate to={{ pathname: location.pathname.replace(/\/+$/, ''), search: location.search, hash: location.hash }} state={location.state} replace />;
  }
  return <Layout />;
}

function IndexRoute() {
  return useMember() ? <CabinetPage /> : <LandingPage />;
}

export default function App() {
  return <BrowserRouter><AuthProvider><GuideProgressProvider><Routes>
    <Route element={<Root />}>
      <Route index element={<IndexRoute />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="auth/callback" element={<AuthCallbackPage />} />
      {/* Old addresses stay valid: sign-up links carried `?next=%2Fcontent`. */}
      <Route path="content" element={<Navigate to="/path" replace />} />
      <Route path="settings" element={<Navigate to="/profile" replace />} />
      <Route path="settings/profile" element={<Navigate to="/profile" replace />} />
      <Route element={<RequireAuth />}>
        <Route path="profile" element={<ProfilePage />} />
        <Route path="password" element={<PasswordPage />} />
        <Route path="path" element={<PathPage />} />
        <Route path="path/:stage/:step" element={<StepPage />} />
        <Route path="library" element={<LibraryPage />} />
      </Route>
      <Route path="*" element={<PageStatus title="Страница не найдена" message="Возможно, адрес изменился. Вернёмся к вашим идеям?" />} />
    </Route>
  </Routes></GuideProgressProvider></AuthProvider></BrowserRouter>;
}
