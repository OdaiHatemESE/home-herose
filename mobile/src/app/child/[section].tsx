import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ComingSoon } from '@/components/ComingSoon';

const TITLES: Record<string, string> = {
  initiatives: 'nav.myInitiatives',
  stars: 'nav.myStars',
  rewards: 'nav.myRewards',
  achievements: 'nav.achievements',
  skills: 'nav.mySkills',
  feedback: 'nav.feedback',
  profile: 'nav.profile',
};

/** Child pages that are still being converted to the app (next phases). */
export default function ChildSection() {
  const { section = '' } = useLocalSearchParams<{ section: string }>();
  const { t } = useTranslation();
  return <ComingSoon title={t(TITLES[section] ?? 'nav.childHome')} webPath={`/child/${section}`} />;
}
