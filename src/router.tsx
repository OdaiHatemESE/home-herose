import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { GuestOnly, RequireChild, RequireOnboarding, RequireParent } from '@/auth/guards';
import { isSupabaseConfigured } from '@/lib/supabase';
import { FullPageLoader } from '@/components/layout/FullPageLoader';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { ParentLayout } from '@/components/layout/ParentLayout';
import { ChildLayout } from '@/components/layout/ChildLayout';
import { Landing } from '@/pages/public/Landing';
import { SetupRequired } from '@/pages/public/SetupRequired';

const Register = lazy(() => import('@/pages/public/Register'));
const ParentLogin = lazy(() => import('@/pages/public/ParentLogin'));
const ChildLogin = lazy(() => import('@/pages/public/ChildLogin'));
const ForgotPassword = lazy(() => import('@/pages/public/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/public/ResetPassword'));
const AcceptInvite = lazy(() => import('@/pages/public/AcceptInvite'));
const Privacy = lazy(() => import('@/pages/public/Privacy'));
const NotFound = lazy(() => import('@/pages/public/NotFound'));
const Onboarding = lazy(() => import('@/pages/onboarding/Onboarding'));

const ParentDashboard = lazy(() => import('@/pages/parent/Dashboard'));
const Approvals = lazy(() => import('@/pages/parent/Approvals'));
const ParentInitiatives = lazy(() => import('@/pages/parent/Initiatives'));
const WeekResults = lazy(() => import('@/pages/parent/WeekResults'));
const FamilyMembers = lazy(() => import('@/pages/parent/FamilyMembers'));
const Tasks = lazy(() => import('@/pages/parent/Tasks'));
const Schedule = lazy(() => import('@/pages/parent/Schedule'));
const Scoring = lazy(() => import('@/pages/parent/Scoring'));
const Levels = lazy(() => import('@/pages/parent/Levels'));
const Rewards = lazy(() => import('@/pages/parent/Rewards'));
const Skills = lazy(() => import('@/pages/parent/Skills'));
const Notes = lazy(() => import('@/pages/parent/Notes'));
const Reports = lazy(() => import('@/pages/parent/Reports'));
const ActivityLog = lazy(() => import('@/pages/parent/ActivityLog'));
const Settings = lazy(() => import('@/pages/parent/Settings'));

const ChildDashboard = lazy(() => import('@/pages/child/Dashboard'));
const ChildTasks = lazy(() => import('@/pages/child/Tasks'));
const ChildTaskDetail = lazy(() => import('@/pages/child/TaskDetail'));
const ChildInitiatives = lazy(() => import('@/pages/child/Initiatives'));
const ChildStars = lazy(() => import('@/pages/child/Stars'));
const ChildSkills = lazy(() => import('@/pages/child/Skills'));
const ChildAchievements = lazy(() => import('@/pages/child/Achievements'));
const ChildRewards = lazy(() => import('@/pages/child/Rewards'));
const ChildFeedback = lazy(() => import('@/pages/child/Feedback'));
const ChildProfile = lazy(() => import('@/pages/child/Profile'));

const PrintWeekly = lazy(() => import('@/pages/print/WeeklySheet'));
const PrintCertificate = lazy(() => import('@/pages/print/Certificate'));
const PrintPoster = lazy(() => import('@/pages/print/Poster'));
const PrintLevels = lazy(() => import('@/pages/print/LevelsGuide'));

const guest = (el: React.ReactNode) => <GuestOnly>{el}</GuestOnly>;

export function AppRouter() {
  if (!isSupabaseConfigured) {
    return (
      <HashRouter>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="*" element={<SetupRequired />} />
          </Route>
        </Routes>
      </HashRouter>
    );
  }
  return (
    <HashRouter>
      <Suspense fallback={<FullPageLoader />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={guest(<Landing />)} />
            <Route path="register" element={guest(<Register />)} />
            <Route path="login" element={guest(<ParentLogin />)} />
            <Route path="child-login" element={guest(<ChildLogin />)} />
            <Route path="forgot-password" element={guest(<ForgotPassword />)} />
            <Route path="reset-password" element={<ResetPassword />} />
            <Route path="invite/:token" element={<AcceptInvite />} />
            <Route path="privacy" element={<Privacy />} />
            <Route element={<RequireOnboarding />}>
              <Route path="onboarding" element={<Onboarding />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route path="parent" element={<RequireParent />}>
            <Route element={<ParentLayout />}>
              <Route index element={<ParentDashboard />} />
              <Route path="approvals" element={<Approvals />} />
              <Route path="initiatives" element={<ParentInitiatives />} />
              <Route path="week" element={<WeekResults />} />
              <Route path="family" element={<FamilyMembers />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="schedule" element={<Schedule />} />
              <Route path="scoring" element={<Scoring />} />
              <Route path="levels" element={<Levels />} />
              <Route path="rewards" element={<Rewards />} />
              <Route path="skills" element={<Skills />} />
              <Route path="notes" element={<Notes />} />
              <Route path="reports" element={<Reports />} />
              <Route path="activity" element={<ActivityLog />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="print/weekly" element={<PrintWeekly />} />
            <Route path="print/certificate" element={<PrintCertificate />} />
            <Route path="print/poster" element={<PrintPoster />} />
            <Route path="print/levels" element={<PrintLevels />} />
          </Route>

          <Route path="child" element={<RequireChild />}>
            <Route element={<ChildLayout />}>
              <Route index element={<ChildDashboard />} />
              <Route path="tasks" element={<ChildTasks />} />
              <Route path="tasks/:taskId" element={<ChildTaskDetail />} />
              <Route path="initiatives" element={<ChildInitiatives />} />
              <Route path="stars" element={<ChildStars />} />
              <Route path="skills" element={<ChildSkills />} />
              <Route path="achievements" element={<ChildAchievements />} />
              <Route path="rewards" element={<ChildRewards />} />
              <Route path="feedback" element={<ChildFeedback />} />
              <Route path="profile" element={<ChildProfile />} />
            </Route>
          </Route>
          <Route path="home" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
