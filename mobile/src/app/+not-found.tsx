import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { TrophyMark } from '@/components/brand';
import { PublicShell } from '@/components/shell';
import { Btn, T } from '@/components/ui';

export default function NotFound() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <PublicShell>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <TrophyMark size={72} />
        <T size={22} w="bold" align="center">
          {t('notFound.title')}
        </T>
        <Btn onPress={() => router.replace('/')}>{t('notFound.back')}</Btn>
      </View>
    </PublicShell>
  );
}
