import * as React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, Award, CalendarDays, ChartColumn, ClipboardCheck, Gift, House, Lightbulb, ListChecks, LogOut, Menu,
  Scale, Settings, Sprout, StickyNote, Trophy, Users, X,
} from 'lucide-react';
import { Dialog as D } from 'radix-ui';
import { useAuth, useParent } from '@/auth/AuthProvider';
import { Logo } from '@/components/brand/Logo';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/dates';
import { LanguageToggle, ThemeToggle } from './Toggles';
import { PageLoader } from './FullPageLoader';

type Item = { to: string; label: string; icon: React.ElementType; badge?: number; end?: boolean };

function usePendingCounts(familyId: string) {
  return useQuery({
    queryKey: ['pending-counts', familyId],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [subs, inits] = await Promise.all([
        supabase.from('task_submissions').select('id', { count: 'exact', head: true }).eq('family_id', familyId).or('status.eq.pending,needs_review.eq.true'),
        supabase.from('initiative_submissions').select('id', { count: 'exact', head: true }).eq('family_id', familyId).eq('status', 'pending'),
      ]);
      return { submissions: subs.count ?? 0, initiatives: inits.count ?? 0 };
    },
  });
}

export function ParentLayout() {
  const { t, i18n } = useTranslation();
  const { familyId, family, profile } = useParent();
  const { signOut } = useAuth();
  const counts = usePendingCounts(familyId).data;
  const [open, setOpen] = React.useState(false);
  const loc = useLocation();
  React.useEffect(() => setOpen(false), [loc.pathname]);

  const groups: { label: string; items: Item[] }[] = [
    {
      label: t('nav.groupDaily'),
      items: [
        { to: '/parent', label: t('nav.dashboard'), icon: House, end: true },
        { to: '/parent/approvals', label: t('nav.approvals'), icon: ClipboardCheck, badge: counts?.submissions },
        { to: '/parent/initiatives', label: t('nav.initiatives'), icon: Lightbulb, badge: counts?.initiatives },
        { to: '/parent/week', label: t('nav.week'), icon: Trophy },
      ],
    },
    {
      label: t('nav.groupSetup'),
      items: [
        { to: '/parent/family', label: t('nav.family'), icon: Users },
        { to: '/parent/tasks', label: t('nav.tasks'), icon: ListChecks },
        { to: '/parent/schedule', label: t('nav.schedule'), icon: CalendarDays },
        { to: '/parent/scoring', label: t('nav.scoring'), icon: Scale },
        { to: '/parent/levels', label: t('nav.levels'), icon: Award },
        { to: '/parent/rewards', label: t('nav.rewards'), icon: Gift },
      ],
    },
    {
      label: t('nav.groupInsights'),
      items: [
        { to: '/parent/skills', label: t('nav.skills'), icon: Sprout },
        { to: '/parent/notes', label: t('nav.notes'), icon: StickyNote },
        { to: '/parent/reports', label: t('nav.reports'), icon: ChartColumn },
        { to: '/parent/activity', label: t('nav.activity'), icon: Activity },
        { to: '/parent/settings', label: t('nav.settings'), icon: Settings },
      ],
    },
  ];

  const tabBar: Item[] = [groups[0].items[0], groups[0].items[1], groups[1].items[1], groups[0].items[3]];

  const nav = (
    <nav aria-label={t('app.name')} className="grid gap-6">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="mb-1.5 px-3 text-xs font-medium text-muted">{g.label}</p>
          <ul className="grid gap-0.5">
            {g.items.map((it) => (
              <li key={it.to}>
                <NavLink
                  to={it.to}
                  end={it.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-[0.95rem] transition-colors',
                      isActive ? 'bg-plum-500 text-white shadow-[var(--shadow-soft)]' : 'text-fg hover:bg-surface-2',
                    )
                  }
                >
                  <it.icon className="size-[1.15rem]" aria-hidden />
                  <span className="flex-1">{it.label}</span>
                  {!!it.badge && (
                    <span className="min-w-6 rounded-full bg-gold-400 px-1.5 text-center text-xs font-semibold text-plum-900">
                      {formatNumber(it.badge, i18n.language)}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  const footer = (
    <div className="grid gap-2 border-t border-app pt-4">
      <div className="px-3 text-sm">
        <div className="font-medium">{profile?.display_name ?? ''}</div>
        <div className="text-muted">{family.name}</div>
      </div>
      <div className="flex items-center gap-1">
        <LanguageToggle />
        <ThemeToggle />
        <button type="button" onClick={() => void signOut()} className="ms-auto rounded-full p-2 text-muted hover:bg-surface-2" aria-label={t('common.signOut')}>
          <LogOut className="size-5 rtl:rotate-180" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:p-2">
        {t('common.skipToContent')}
      </a>
      {/* desktop sidebar */}
      <aside className="no-print sticky top-0 hidden h-dvh flex-col gap-6 overflow-y-auto border-e border-app bg-surface px-3 py-5 lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <div className="flex-1">{nav}</div>
        {footer}
      </aside>

      {/* mobile top bar */}
      <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-app bg-surface/90 px-4 py-2.5 backdrop-blur lg:hidden">
        <Logo />
        <D.Root open={open} onOpenChange={setOpen}>
          <D.Trigger className="rounded-full p-2 hover:bg-surface-2" aria-label={t('common.more')}>
            <Menu className="size-6" />
          </D.Trigger>
          <D.Portal>
            <D.Overlay className="fixed inset-0 z-40 bg-plum-950/50" />
            <D.Content className="fixed inset-y-0 end-0 z-50 flex w-[min(20rem,88vw)] flex-col gap-5 overflow-y-auto bg-surface p-4 shadow-[var(--shadow-lift)]">
              <div className="flex items-center justify-between">
                <D.Title className="font-semibold">{family.name}</D.Title>
                <D.Description className="sr-only">{t('app.name')}</D.Description>
                <D.Close className="rounded-full p-2 hover:bg-surface-2" aria-label={t('common.close')}>
                  <X className="size-5" />
                </D.Close>
              </div>
              <div className="flex-1">{nav}</div>
              {footer}
            </D.Content>
          </D.Portal>
        </D.Root>
      </header>

      <main id="main" className="min-w-0 px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pt-8 lg:pb-12">
        <div className="mx-auto max-w-6xl">
          <React.Suspense fallback={<PageLoader />}>
            <Outlet />
          </React.Suspense>
        </div>
      </main>

      {/* mobile tab bar */}
      <nav aria-label={t('common.more')} className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-app bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="grid grid-cols-4">
          {tabBar.map((it) => (
            <li key={it.to}>
              <NavLink
                to={it.to}
                end={it.end}
                className={({ isActive }) =>
                  cn('relative flex flex-col items-center gap-0.5 py-2 text-[0.72rem]', isActive ? 'text-plum-600 dark:text-plum-200' : 'text-muted')
                }
              >
                <it.icon className="size-6" aria-hidden />
                {it.label}
                {!!it.badge && (
                  <span className="absolute top-1 start-[55%] min-w-5 rounded-full bg-gold-400 px-1 text-center text-[0.65rem] font-semibold text-plum-900">
                    {formatNumber(it.badge, i18n.language)}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
