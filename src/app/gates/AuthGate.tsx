import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Splash } from '@/components/ui';
import { qk } from '@/lib/queryKeys';
import { syncConfig } from '@/modules/households/api';
import { useAuth } from '../auth/AuthProvider';
import { pending } from '../auth/pending';

/** Signed-in users only. Everyone else goes to sign-in and comes back after. */
export function AuthGate() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const qc = useQueryClient();
  const synced = useRef(false);

  useEffect(() => {
    if (!user || synced.current) return;
    synced.current = true;
    void syncConfig().then(() => {
      void qc.invalidateQueries({ queryKey: qk.isOperator(user.id) });
      void qc.invalidateQueries({ queryKey: qk.publicConfig });
    });
  }, [user, qc]);

  if (loading) return <Splash />;
  if (!user) {
    pending.setPath(location.pathname + location.search);
    return <Navigate to="/signin" replace />;
  }
  return <Outlet />;
}
