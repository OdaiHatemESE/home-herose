import * as React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { FullPageLoader } from '@/components/layout/FullPageLoader';

/** Sends a signed-in user to the right home for their role. */
export function homePathFor(kind: string) {
  if (kind === 'child') return '/child';
  if (kind === 'parent') return '/parent';
  if (kind === 'parent-no-family') return '/onboarding';
  return '/';
}

export function RequireParent() {
  const { ready, session, identity, identityLoading } = useAuth();
  const loc = useLocation();
  if (!ready || identityLoading) return <FullPageLoader />;
  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (identity.kind === 'parent-no-family') return <Navigate to="/onboarding" replace />;
  if (identity.kind !== 'parent') return <Navigate to={homePathFor(identity.kind)} replace />;
  return <Outlet />;
}

export function RequireOnboarding() {
  const { ready, session, identity, identityLoading } = useAuth();
  if (!ready || identityLoading) return <FullPageLoader />;
  if (!session) return <Navigate to="/register" replace />;
  if (identity.kind !== 'parent-no-family') return <Navigate to={homePathFor(identity.kind)} replace />;
  return <Outlet />;
}

export function RequireChild() {
  const { ready, session, identity, identityLoading } = useAuth();
  if (!ready || identityLoading) return <FullPageLoader />;
  if (!session) return <Navigate to="/child-login" replace />;
  if (identity.kind !== 'child') return <Navigate to={homePathFor(identity.kind)} replace />;
  return <Outlet />;
}

/** Public auth pages bounce signed-in users to their home. */
export function GuestOnly({ children }: { children: React.ReactNode }) {
  const { ready, session, identity, identityLoading } = useAuth();
  if (!ready || (session && identityLoading)) return <FullPageLoader />;
  if (session && identity.kind !== 'none') return <Navigate to={homePathFor(identity.kind)} replace />;
  return <>{children}</>;
}
