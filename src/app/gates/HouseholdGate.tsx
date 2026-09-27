import { useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Button, EmptyState, Splash } from '@/components/ui';
import { todayIn } from '@/lib/dates';
import { HouseholdContext, type HouseholdValue } from '@/modules/households/context';
import { useMembershipQuery } from '@/modules/households/hooks';
import { useHouseholdRealtime } from '@/modules/households/realtime';
import { useCopy, useRootTheme } from '@/theme';

/** Today in the household timezone, re-checked every minute so it rolls over at midnight. */
function useHouseholdToday(timezone: string | undefined) {
  const [today, setToday] = useState(() => todayIn(timezone ?? 'UTC'));
  useEffect(() => {
    if (!timezone) return;
    const tick = () => setToday(todayIn(timezone));
    tick();
    const id = setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [timezone]);
  return today;
}

/** Members only. Provides the household and applies the member's theme. */
export function HouseholdGate() {
  const t = useCopy();
  const { data, isLoading, error, refetch } = useMembershipQuery();
  const today = useHouseholdToday(data?.household.timezone);
  const { setThemeId, setModePreference } = useRootTheme();

  const value = useMemo<HouseholdValue | null>(() => {
    if (!data) return null;
    const byId = new Map(data.members.map((m) => [m.id, m]));
    return {
      ...data,
      today,
      isOwner: data.member.role === 'owner',
      memberById: (id) => (id ? byId.get(id) : undefined),
    };
  }, [data, today]);

  const themeId = data ? (data.member.theme ?? data.settings.default_theme) : null;
  const mode = data?.member.mode;
  useEffect(() => {
    if (themeId) setThemeId(themeId);
    if (mode) setModePreference(mode);
  }, [themeId, mode, setThemeId, setModePreference]);

  if (isLoading) return <Splash />;
  if (error) {
    return (
      <EmptyState
        icon="home"
        title={t('common.error')}
        action={<Button onClick={() => void refetch()}>{t('common.retry')}</Button>}
      />
    );
  }
  if (!value) return <Navigate to="/welcome" replace />;
  return (
    <HouseholdContext.Provider value={value}>
      <Realtime householdId={value.household.id} userId={value.member.user_id} />
      <Outlet />
    </HouseholdContext.Provider>
  );
}

function Realtime({ householdId, userId }: { householdId: string; userId: string }) {
  useHouseholdRealtime(householdId, userId);
  return null;
}
