import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import ExternalLink from 'lucide-react-native/icons/external-link';
import { openWebsite } from '@/lib/links';
import { brand, R, useTheme } from '@/lib/theme';
import { TrophyMark } from './brand';
import { Btn, Screen, T } from './ui';

/** A page not converted to the app yet: says so honestly and opens the same page on the website. */
export function ComingSoon({ title, webPath }: { title: string; webPath: string }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  return (
    <Screen maxWidth={640}>
      <View style={{ alignItems: 'center', gap: 14, backgroundColor: c.surface, borderRadius: R.hero, borderWidth: 1, borderColor: c.border, padding: 28, marginTop: 24 }}>
        <TrophyMark size={64} />
        <T size={24} w="bold" align="center" accessibilityRole="header">
          {title}
        </T>
        <T size={17} w="semibold" align="center" color={c.dark ? brand.plum200 : brand.plum600}>
          {t('mobile.comingSoonTitle')}
        </T>
        <T align="center" color={c.muted}>
          {t('mobile.comingSoonBody')}
        </T>
        <Btn variant="soft" onPress={() => void openWebsite(webPath)} icon={(col, s) => <ExternalLink size={s} color={col} />}>
          {t('mobile.openOnWebsite')}
        </Btn>
      </View>
    </Screen>
  );
}
