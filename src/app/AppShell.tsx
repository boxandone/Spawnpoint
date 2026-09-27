import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TabBar, type TabItem } from '@/components/ui';
import { useHousehold } from '@/modules/households/context';
import { useCopy } from '@/theme';
import { useUnseenUpdate } from './updates/useUpdates';
import { RewardsWatcher } from '@/modules/rewards/components/RewardsWatcher';

/** Mobile shell: content column plus the bottom tab bar (Today · Lists · Stuff · Plans · Me). */
export function AppShell() {
  const t = useCopy();
  const { settings } = useHousehold();
  const m = settings.modules;
  const { pathname } = useLocation();
  const { unseen } = useUnseenUpdate();
  // Bug reports include the last screen someone was on (no ids or content).
  useEffect(() => {
    try {
      sessionStorage.setItem('sp.lastPath', pathname.replace(/[0-9a-f-]{36}/g, ':id'));
    } catch {
      /* ignore */
    }
  }, [pathname]);
  const items: TabItem[] = [
    { to: '/', label: t('nav.today'), icon: 'today', end: true },
    ...(m.lists ? [{ to: '/lists', label: t('nav.lists'), icon: 'lists' as const }] : []),
    ...(m.stuff ? [{ to: '/stuff', label: t('nav.stuff'), icon: 'stuff' as const }] : []),
    ...(m.plans ? [{ to: '/plans', label: t('nav.plans'), icon: 'plans' as const }] : []),
    { to: '/me', label: t('nav.me'), icon: 'me', badge: unseen, badgeLabel: t('updates.dot') },
  ];
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-theme focus:bg-surface focus:p-3"
      >
        {t('nav.main')}
      </a>
      <RewardsWatcher />
      <main id="main" className="mx-auto min-h-[100dvh] max-w-lg px-4 pb-tabbar">
        <Outlet />
      </main>
      <TabBar
        items={items}
        // Scan floats over the tab screens only, so it never covers a sub-page's own buttons.
        action={
          items.some((i) => i.to === pathname)
            ? { to: '/scan', label: t('nav.scan'), icon: 'scan' }
            : undefined
        }
        label={t('nav.main')}
      />
    </>
  );
}
