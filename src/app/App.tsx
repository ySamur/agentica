import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router';
import { LandingPage } from '../pages/landing/LandingPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { AuthCallbackPage } from '../pages/auth/AuthCallbackPage';
import { ProfilePage } from '../pages/settings/ProfilePage';
import { ContentPage } from '../pages/content/ContentPage';
import { AuthProvider, useAuth } from '../features/auth/AuthProvider';
import { RequireAuth } from '../features/auth/RequireAuth';
import { clearDestination } from '../features/auth/redirect';
import { StarterDialog } from '../features/starter/StarterDialog';
import { SiteHeader } from '../components/SiteHeader';
import { PageStatus } from '../components/PageStatus';

export type PageContext = { openStarter: () => void };

function Layout() {
  const [starterOpen, setStarterOpen] = useState(false);
  const location = useLocation();
  const { error, user } = useAuth();
  const openStarter = () => setStarterOpen(true);

  useEffect(() => {
    const titles: Record<string, string> = {
      '/': 'Вы создаёте. Агенты ускоряют.',
      '/login': 'Вход и регистрация',
      '/auth/callback': 'Завершение входа',
      '/settings/profile': 'Настройки профиля',
      '/content': 'Контент для участников',
    };
    document.title = `agentica — ${titles[location.pathname] || 'Страница не найдена'}`;
    if (!['/login', '/auth/callback'].includes(location.pathname)) clearDestination();
    const frame = requestAnimationFrame(() => {
      if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
      else window.scrollTo({ top: 0, behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);

  return <>
    {/* Remounting per route resets the mobile and account menus after any navigation. */}
    <SiteHeader key={location.pathname} onStart={openStarter} />
    {error && !user && location.pathname === '/' && <p className="auth-notice container" role="status">{error}</p>}
    <Outlet context={{ openStarter } satisfies PageContext} />
    <StarterDialog open={starterOpen} onClose={() => setStarterOpen(false)} />
  </>;
}

export default function App() {
  return <BrowserRouter><AuthProvider><Routes>
    <Route element={<Layout />}>
      <Route index element={<LandingPage />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="auth/callback" element={<AuthCallbackPage />} />
      <Route element={<RequireAuth />}>
        <Route path="settings" element={<Navigate to="/settings/profile" replace />} />
        <Route path="settings/profile" element={<ProfilePage />} />
        <Route path="content" element={<ContentPage />} />
      </Route>
      <Route path="*" element={<PageStatus title="Страница не найдена" message="Возможно, адрес изменился. Вернёмся к вашим идеям?" />} />
    </Route>
  </Routes></AuthProvider></BrowserRouter>;
}
