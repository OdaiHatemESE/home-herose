import { Slot } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Award from 'lucide-react-native/icons/award';
import Gift from 'lucide-react-native/icons/gift';
import House from 'lucide-react-native/icons/house';
import Lightbulb from 'lucide-react-native/icons/lightbulb';
import ListChecks from 'lucide-react-native/icons/list-checks';
import MessageCircleHeart from 'lucide-react-native/icons/message-circle-heart';
import Sprout from 'lucide-react-native/icons/sprout';
import Star from 'lucide-react-native/icons/star';
import UserRound from 'lucide-react-native/icons/user-round';
import { useAuth, useChildIdentity } from '@/auth/AuthProvider';
import { ChildAvatar } from '@/components/brand';
import { AccountFooter, AppFrame, type NavItem } from '@/components/nav';
import { Row, T } from '@/components/ui';

export default function ChildLayout() {
  const { t } = useTranslation();
  const { child, family } = useChildIdentity();
  const { signOut } = useAuth();
  const simple = child.ui_mode === 'simple';

  const items: NavItem[] = [
    { href: '/child', label: t('nav.childHome'), icon: House, exact: true },
    { href: '/child/tasks', label: t('nav.myTasks'), icon: ListChecks },
    { href: '/child/initiatives', label: t('nav.myInitiatives'), icon: Lightbulb },
    { href: '/child/stars', label: t('nav.myStars'), icon: Star },
    { href: '/child/rewards', label: t('nav.myRewards'), icon: Gift },
    { href: '/child/achievements', label: t('nav.achievements'), icon: Award },
    { href: '/child/skills', label: t('nav.mySkills'), icon: Sprout },
    { href: '/child/feedback', label: t('nav.feedback'), icon: MessageCircleHeart },
    { href: '/child/profile', label: t('nav.profile'), icon: UserRound },
  ];
  // the youngest heroes get four big tabs only (same as the website)
  const tabs = simple ? [items[0], items[2], items[3], items[4]] : [items[0], items[1], items[2], items[3], items[4]];

  return (
    <AppFrame
      groups={[{ label: '', items: simple ? tabs : items }]}
      tabs={tabs}
      simpleTabs={simple}
      header={
        <Row gap={10}>
          <ChildAvatar avatar={child.avatar} color={child.color} size="sm" />
          <T w="semibold">{child.display_name}</T>
        </Row>
      }
      footer={<AccountFooter name={child.display_name} sub={family.name} onSignOut={() => void signOut()} />}
    >
      <Slot />
    </AppFrame>
  );
}
