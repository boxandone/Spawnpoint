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
import { FeedbackPage } from './help/FeedbackPage';
import { HelpPage } from './help/HelpPage';
import { MePage } from './me/MePage';
import { UpdatesPage } from './updates/UpdatesPage';
import { BadgesPage } from './rewards/BadgesPage';
import { FeedPage } from './rewards/FeedPage';
import { ShopPage } from './rewards/ShopPage';
import { InviteProblemRoute, NotFound } from './NotFound';
import { NeedInvitePage } from './onboarding/NeedInvitePage';
import { JoinInvitePage, StartInvitePage } from './onboarding/InvitePages';
import { ComingSoon } from './placeholders/ComingSoon';

/** Less-used screens load on demand to keep the first load small. */
function Lazy({ load }: { load: () => Promise<{ default: ComponentType }> }) {
  // Each route passes its own (stable) loader. Keying on it matters: React
  // reuses this component when moving between two lazy routes.
  const Component = useMemo(() => lazy(load), [load]);
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
      { path: '/help', element: <HelpPage /> },
      { path: '/help/feedback/:kind', element: <FeedbackPage /> },
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
              { path: '/me/badges', element: <BadgesPage /> },
              { path: '/me/shop', element: <ShopPage /> },
              { path: '/feed', element: <FeedPage /> },
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
              {
                path: '/lists',
                element: (
                  <Lazy
                    load={() => import('./lists/ListsPage').then((m) => ({ default: m.ListsPage }))}
                  />
                ),
              },
              {
                path: '/lists/:id',
                element: (
                  <Lazy
                    load={() => import('./lists/ListPage').then((m) => ({ default: m.ListPage }))}
                  />
                ),
              },
              {
                path: '/stuff',
                element: (
                  <Lazy
                    load={() => import('./stuff/StuffPage').then((m) => ({ default: m.StuffPage }))}
                  />
                ),
              },
              {
                path: '/stuff/new',
                element: (
                  <Lazy
                    load={() =>
                      import('./stuff/ItemEditorPage').then((m) => ({ default: m.ItemEditorPage }))
                    }
                  />
                ),
              },
              {
                path: '/stuff/docs',
                element: (
                  <Lazy
                    load={() =>
                      import('./stuff/DocumentsPage').then((m) => ({ default: m.DocumentsPage }))
                    }
                  />
                ),
              },
              {
                path: '/stuff/labels',
                element: (
                  <Lazy
                    load={() =>
                      import('./stuff/LabelsPage').then((m) => ({ default: m.LabelsPage }))
                    }
                  />
                ),
              },
              {
                path: '/stuff/:id',
                element: (
                  <Lazy
                    load={() => import('./stuff/ItemPage').then((m) => ({ default: m.ItemPage }))}
                  />
                ),
              },
              {
                path: '/stuff/:id/edit',
                element: (
                  <Lazy
                    load={() =>
                      import('./stuff/ItemEditorPage').then((m) => ({ default: m.ItemEditorPage }))
                    }
                  />
                ),
              },
              {
                path: '/places/:id',
                element: (
                  <Lazy
                    load={() => import('./stuff/PlacePage').then((m) => ({ default: m.PlacePage }))}
                  />
                ),
              },
              {
                path: '/s/:code',
                element: (
                  <Lazy
                    load={() =>
                      import('./stuff/ShortCodePage').then((m) => ({ default: m.ShortCodePage }))
                    }
                  />
                ),
              },
              { path: '/plans', element: <ComingSoon title="plans.name" icon="plans" /> },
              {
                path: '/scan',
                element: (
                  <Lazy
                    load={() => import('./stuff/ScanPage').then((m) => ({ default: m.ScanPage }))}
                  />
                ),
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]);
