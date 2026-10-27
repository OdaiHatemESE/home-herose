import * as React from 'react';
import { Slot, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Activity from 'lucide-react-native/icons/activity';
import Award from 'lucide-react-native/icons/award';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import ChartColumn from 'lucide-react-native/icons/chart-column';
import ClipboardCheck from 'lucide-react-native/icons/clipboard-check';
import Gift from 'lucide-react-native/icons/gift';
import House from 'lucide-react-native/icons/house';
import Lightbulb from 'lucide-react-native/icons/lightbulb';
import ListChecks from 'lucide-react-native/icons/list-checks';
import Scale from 'lucide-react-native/icons/scale';
import Settings from 'lucide-react-native/icons/settings';
import Sprout from 'lucide-react-native/icons/sprout';
import StickyNote from 'lucide-react-native/icons/sticky-note';
import Trophy from 'lucide-react-native/icons/trophy';
import Users from 'lucide-react-native/icons/users';
import { useAuth, useParent } from '@/auth/AuthProvider';
import { AppFrame, type NavGroup } from '@/components/nav';
import { T } from '@/components/ui';
import { brand } from '@/lib/theme';
import { getPref } from '@/lib/prefs';
import { supabase } from '@/lib/supabase';

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

export default function ParentLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const { familyId, family, profile, membership } = useParent();
  const { signOut } = useAuth();
  const counts = usePendingCounts(familyId).data;

  // a parent who signed in from an invitation link goes back to it
  React.useEffect(() => {
    void getPref('pending-invite').then((token) => {
      if (token) router.navigate(`/invite/${token}`);
    });
  }, [router]);

  const groups: NavGroup[] = [
    {
      label: t('nav.groupDaily'),
      items: [
        { href: '/parent', label: t('nav.dashboard'), icon: House, exact: true },
        { href: '/parent/approvals', label: t('nav.approvals'), icon: ClipboardCheck, badge: counts?.submissions },
        { href: '/parent/initiatives', label: t('nav.initiatives'), icon: Lightbulb, badge: counts?.initiatives },
        { href: '/parent/week', label: t('nav.week'), short: t('mobile.weekShort'), icon: Trophy },
      ],
    },
    {
      label: t('nav.groupSetup'),
      items: [
        { href: '/parent/family', label: t('nav.family'), short: t('mobile.familyShort'), icon: Users },
        { href: '/parent/tasks', label: t('nav.tasks'), icon: ListChecks },
        { href: '/parent/schedule', label: t('nav.schedule'), icon: CalendarDays },
        { href: '/parent/scoring', label: t('nav.scoring'), icon: Scale },
        { href: '/parent/levels', label: t('nav.levels'), icon: Award },
        { href: '/parent/rewards', label: t('nav.rewards'), icon: Gift },
      ],
    },
    {
      label: t('nav.groupInsights'),
      items: [
        { href: '/parent/skills', label: t('nav.skills'), icon: Sprout },
        { href: '/parent/notes', label: t('nav.notes'), icon: StickyNote },
        { href: '/parent/reports', label: t('nav.reports'), icon: ChartColumn },
        { href: '/parent/activity', label: t('nav.activity'), icon: Activity },
        { href: '/parent/settings', label: t('nav.settings'), icon: Settings },
      ],
    },
  ];
  // bottom bar (phone) shows the first four; the rail (tablet) shows all six; the rest is under «More»
  const primary = [...groups[0].items, groups[1].items[0], groups[1].items[1]];
  const name = profile?.display_name ?? membership.display_name ?? '';

  return (
    <AppFrame
      groups={groups}
      primary={primary}
      account={{
        name,
        sub: family.name,
        onSignOut: () => void signOut(),
        emblem: (
          <T size={17} w="bold" color={brand.plum600} align="center">
            {(name.trim()[0] ?? '★').toUpperCase()}
          </T>
        ),
      }}
    >
      <Slot />
    </AppFrame>
  );
}
