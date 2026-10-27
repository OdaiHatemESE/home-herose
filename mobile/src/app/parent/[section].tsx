import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ComingSoon } from '@/components/ComingSoon';

const SECTIONS = ['approvals', 'initiatives', 'week', 'family', 'tasks', 'schedule', 'scoring', 'levels', 'rewards', 'skills', 'notes', 'reports', 'activity', 'settings'];

/** Parent pages that are still being converted to the app (next phases). */
export default function ParentSection() {
  const { section = '' } = useLocalSearchParams<{ section: string }>();
  const { t } = useTranslation();
  const key = SECTIONS.includes(section) ? section : 'dashboard';
  return <ComingSoon title={t(`nav.${key}`)} webPath={`/parent/${section}`} />;
}
