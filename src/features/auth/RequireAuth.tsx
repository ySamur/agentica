import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './AuthProvider';
import { PageStatus } from '../../components/PageStatus';
import { safeDestination } from './redirect';

export function RequireAuth() {
  const { user, loading, signingOut } = useAuth();
  const location = useLocation();
  if (loading) return <PageStatus title="Проверяем сессию…" />;
  if (signingOut) return <PageStatus title="Выходим из аккаунта…" />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(safeDestination(location.pathname))}`} replace />;
  return <Outlet key={user.id} />;
}
