import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import { PublicShell } from '@/components/shell';
import { T } from '@/components/ui';
import { useDir } from '@/i18n';
import { useLayout } from '@/lib/layout';
import { brand } from '@/lib/theme';

export default function Privacy() {
  const { t } = useTranslation();
  const L = useLayout();
  const dir = useDir();
  const insets = useSafeAreaInsets();
  return (
    <PublicShell back>
      <ScrollView contentContainerStyle={{ paddingHorizontal: L.gutter, paddingTop: 16, paddingBottom: insets.bottom + 32 }}>
        <View style={{ maxWidth: 720, width: '100%', alignSelf: 'center', gap: 16 }}>
          <View style={{ alignItems: dir.alignStart }}>
            <ShieldCheck size={42} color={brand.leaf500} />
          </View>
          <T size={28} w="bold" accessibilityRole="header">
            {t('privacyPage.title')}
          </T>
          {(['p1', 'p2', 'p3', 'p4', 'p5', 'p6'] as const).map((k) => (
            <T key={k} size={17}>
              {t(`privacyPage.${k}`)}
            </T>
          ))}
        </View>
      </ScrollView>
    </PublicShell>
  );
}
