import { lazy, Suspense, useMemo, type ComponentType } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { Splash } from '@/components/ui';
import { AppShell } from './AppShell';
import { AuthCallbackPage, SignInPage } from './auth/SignInPage';
import { AreaDetailPage, AreasPage } from './chores/AreasPage';
import { CatchUpPage } from './chores/CatchUpPage';
import { HistoryPage } from './chores/HistoryPage';
import { TaskEditorPage } from './chores/TaskEditorPage';
import { TodayPage } from './chores/TodayPage';
import { UpcomingPage } from './chores/UpcomingPage';
import { AuthGate } from './gates/AuthGate';
import { HouseholdGate } from './gates/HouseholdGate';
import { PrivacyPage, TermsPage } from './legal/LegalPages';
import { MePage } from './me/MePage';
import { UpdatesPage } from './updates/UpdatesPage';
import { InviteProblemRoute, NotFound } from './NotFound';
import { NeedInvitePage } from './onboarding/NeedInvitePage';
import { JoinInvitePage, StartInvitePage } from './onboarding/InvitePages';
import { ComingSoon } from './placeholders/ComingSoon';

/** Less-used screens load on demand to keep the first load small. */
function Lazy({ load }: { load: () => Promise<{ default: ComponentType }> }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const Component = useMemo(() => lazy(load), []);
  return (
    <Suspense fallback={<Splash />}>
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/styleguide',
    element: (
      <Lazy
        load={() =>
          import('./styleguide/StyleguidePage').then((m) => ({ default: m.StyleguidePage }))
        }
      />
    ),
  },
  { path: '/signin', element: <SignInPage /> },
  { path: '/privacy', element: <PrivacyPage /> },
  { path: '/terms', element: <TermsPage /> },
  { path: '/auth/callback', element: <AuthCallbackPage /> },
  { path: '/start/:code', element: <StartInvitePage /> },
  { path: '/join/:code', element: <JoinInvitePage /> },
  {
    element: <AuthGate />,
    errorElement: <InviteProblemRoute />,
    children: [
      { path: '/welcome', element: <NeedInvitePage /> },
      {
        path: '/setup',
        element: (
          <Lazy
            load={() =>
              import('./onboarding/SetupWizard').then((m) => ({ default: m.SetupWizard }))
            }
          />
        ),
      },
      {
        path: '/operator',
        element: (
          <Lazy
            load={() =>
              import('./operator/OperatorPage').then((m) => ({ default: m.OperatorPage }))
            }
          />
        ),
      },
      {
        element: <HouseholdGate />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: <TodayPage /> },
              { path: '/catch-up', element: <CatchUpPage /> },
              { path: '/areas', element: <AreasPage /> },
              { path: '/areas/:id', element: <AreaDetailPage /> },
              { path: '/upcoming', element: <UpcomingPage /> },
              { path: '/history', element: <HistoryPage /> },
              { path: '/tasks/new', element: <TaskEditorPage /> },
              { path: '/tasks/:id', element: <TaskEditorPage /> },
              { path: '/me', element: <MePage /> },
              { path: '/updates', element: <UpdatesPage /> },
              {
                path: '/settings/personal',
                element: (
                  <Lazy
                    load={() =>
                      import('./settings/PersonalSettingsPage').then((m) => ({
                        default: m.PersonalSettingsPage,
                      }))
                    }
                  />
                ),
              },
              {
                path: '/settings/household',
                element: (
                  <Lazy
                    load={() =>
                      import('./settings/HouseholdSettingsPage').then((m) => ({
                        default: m.HouseholdSettingsPage,
                      }))
                    }
                  />
                ),
              },
              { path: '/lists', element: <ComingSoon title="lists.name" icon="lists" /> },
              { path: '/stuff', element: <ComingSoon title="stuff.name" icon="stuff" /> },
              { path: '/plans', element: <ComingSoon title="plans.name" icon="plans" /> },
              { path: '/scan', element: <ComingSoon title="nav.scan" icon="scan" /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]);
