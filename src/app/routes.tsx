import { createBrowserRouter } from 'react-router-dom';
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
import { MePage } from './me/MePage';
import { InviteProblemRoute, NotFound } from './NotFound';
import { NeedInvitePage } from './onboarding/NeedInvitePage';
import { JoinInvitePage, StartInvitePage } from './onboarding/InvitePages';
import { SetupWizard } from './onboarding/SetupWizard';
import { OperatorPage } from './operator/OperatorPage';
import { ComingSoon } from './placeholders/ComingSoon';
import { HouseholdSettingsPage } from './settings/HouseholdSettingsPage';
import { PersonalSettingsPage } from './settings/PersonalSettingsPage';
import { StyleguidePage } from './styleguide/StyleguidePage';

export const router = createBrowserRouter([
  { path: '/styleguide', element: <StyleguidePage /> },
  { path: '/signin', element: <SignInPage /> },
  { path: '/auth/callback', element: <AuthCallbackPage /> },
  { path: '/start/:code', element: <StartInvitePage /> },
  { path: '/join/:code', element: <JoinInvitePage /> },
  {
    element: <AuthGate />,
    errorElement: <InviteProblemRoute />,
    children: [
      { path: '/welcome', element: <NeedInvitePage /> },
      { path: '/setup', element: <SetupWizard /> },
      { path: '/operator', element: <OperatorPage /> },
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
              { path: '/settings/personal', element: <PersonalSettingsPage /> },
              { path: '/settings/household', element: <HouseholdSettingsPage /> },
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
