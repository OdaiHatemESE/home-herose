import * as React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Award, Gift, House, Lightbulb, ListChecks, LogOut, MessageCircleHeart, Sprout, Star, UserRound } from 'lucide-react';
import { useAuth, useChildIdentity } from '@/auth/AuthProvider';
import { cn } from '@/lib/utils';
import { ChildAvatar } from '@/components/brand/misc';
import { TrophyMark } from '@/components/brand/Logo';
import { LanguageToggle, ThemeToggle } from './Toggles';
import { PageLoader } from './FullPageLoader';

export function ChildLayout() {
  const { t } = useTranslation();
  const { child } = useChildIdentity();
  const { signOut } = useAuth();
  const simple = child.ui_mode === 'simple';

  const items = [
    { to: '/child', label: t('nav.childHome'), icon: House, end: true },
    { to: '/child/tasks', label: t('nav.myTasks'), icon: ListChecks },
    { to: '/child/initiatives', label: t('nav.myInitiatives'), icon: Lightbulb },
    { to: '/child/stars', label: t('nav.myStars'), icon: Star },
    { to: '/child/rewards', label: t('nav.myRewards'), icon: Gift },
    { to: '/child/achievements', label: t('nav.achievements'), icon: Award },
    { to: '/child/skills', label: t('nav.mySkills'), icon: Sprout },
    { to: '/child/feedback', label: t('nav.feedback'), icon: MessageCircleHeart },
    { to: '/child/profile', label: t('nav.profile'), icon: UserRound },
  ];
  const tabs = simple ? [items[0], items[2], items[3], items[4]] : [items[0], items[1], items[2], items[3], items[4]];

  return (
    <div className="min-h-dvh bg-[radial-gradient(60rem_30rem_at_100%_-10%,rgb(242_183_5/0.14),transparent),radial-gradient(50rem_30rem_at_0%_0%,rgb(109_63_214/0.12),transparent)]">
      <header className="no-print mx-auto flex max-w-3xl items-center justify-between px-4 pt-4">
        <NavLink to="/child/profile" className="flex items-center gap-2.5" aria-label={t('nav.profile')}>
          <ChildAvatar avatar={child.avatar} color={child.color} size="sm" />
          <span className="font-semibold">{child.display_name}</span>
        </NavLink>
        <div className="flex items-center">
          <TrophyMark className="me-1 size-7" />
          <LanguageToggle />
          <ThemeToggle />
          <button type="button" onClick={() => void signOut()} className="rounded-full p-2 text-muted hover:bg-surface-2" aria-label={t('common.signOut')}>
            <LogOut className="size-5 rtl:rotate-180" />
          </button>
        </div>
      </header>

      {!simple && (
        <nav aria-label={t('nav.childHome')} className="no-print mx-auto mt-3 hidden max-w-3xl px-4 sm:block">
          <ul className="flex flex-wrap gap-1.5">
            {items.map((it) => (
              <li key={it.to}>
                <NavLink
                  to={it.to}
                  end={it.end}
                  className={({ isActive }) =>
                    cn('inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm', isActive ? 'bg-plum-500 text-white' : 'bg-surface text-fg hover:bg-surface-2')
                  }
                >
                  <it.icon className="size-4" aria-hidden />
                  {it.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <main id="main" className="mx-auto max-w-3xl px-4 pt-5 pb-28 sm:pb-12">
        <React.Suspense fallback={<PageLoader />}>
          <Outlet />
        </React.Suspense>
      </main>

      <nav aria-label={t('nav.childHome')} className={cn('no-print fixed inset-x-0 bottom-0 z-30 border-t border-app bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur', !simple && 'sm:hidden')}>
        <ul className={cn('grid', simple ? 'grid-cols-4' : 'grid-cols-5')}>
          {tabs.map((it) => (
            <li key={it.to}>
              <NavLink
                to={it.to}
                end={it.end}
                className={({ isActive }) =>
                  cn('flex flex-col items-center gap-0.5 text-[0.72rem]', simple ? 'py-3' : 'py-2', isActive ? 'text-plum-600 dark:text-plum-200' : 'text-muted')
                }
              >
                <it.icon className={simple ? 'size-8' : 'size-6'} aria-hidden />
                {it.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
