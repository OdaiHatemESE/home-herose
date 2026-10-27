import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import HeartHandshake from 'lucide-react-native/icons/heart-handshake';
import KeyRound from 'lucide-react-native/icons/key-round';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import Sparkles from 'lucide-react-native/icons/sparkles';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { LevelBadge, MedalTrack, TrophyMark } from '@/components/brand';
import { PublicShell } from '@/components/shell';
import { Btn, Card, Grid, Row, T } from '@/components/ui';
import { useDir } from '@/i18n';
import { useLayout } from '@/lib/layout';
import { brand, R, useTheme } from '@/lib/theme';

const DEMO_LEVELS = [
  { id: 'b', code: 'bronze', name_ar: 'البرونزي', name_en: 'Bronze', icon: '🥉', color: 'bronze', min_percent: 60, is_active: true },
  { id: 's', code: 'silver', name_ar: 'الفضي', name_en: 'Silver', icon: '🥈', color: 'silver', min_percent: 75, is_active: true },
  { id: 'g', code: 'gold', name_ar: 'الذهبي', name_en: 'Gold', icon: '🥇', color: 'gold', min_percent: 90, is_active: true },
];

/** Welcome: who are you? Parents create or sign in, heroes sign in with the family code. */
export default function Welcome() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const L = useLayout();
  const dir = useDir();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [p, setP] = React.useState(8);
  React.useEffect(() => {
    const id = setTimeout(() => setP(93), 350);
    return () => clearTimeout(id);
  }, []);
  const Forward = dir.rtl ? ChevronLeft : ChevronRight;

  const intro = (
    <View style={{ gap: 18, flex: L.tablet ? 1.1 : undefined }}>
      <T display size={L.tablet ? 64 : 46} color={c.dark ? brand.plum200 : brand.plum600} style={{ lineHeight: L.tablet ? 80 : 60 }}>
        {t('landing.heroTitle')}
      </T>
      <T size={L.tablet ? 18 : 16} color={c.muted}>
        {t('landing.heroBody')}
      </T>
      <View style={{ gap: 10, flexDirection: L.tablet ? dir.row : 'column' }}>
        <Btn size="lg" onPress={() => router.push('/register')} style={L.tablet ? { flex: 1 } : undefined}>
          {t('landing.startFamily')}
        </Btn>
        <Btn size="lg" variant="outline" onPress={() => router.push('/login')} style={L.tablet ? { flex: 1 } : undefined}>
          {t('landing.parentLogin')}
        </Btn>
      </View>
      <Pressable
        onPress={() => router.push('/child-login')}
        accessibilityRole="button"
        style={({ pressed }) => ({
          flexDirection: dir.row,
          alignItems: 'center',
          gap: 12,
          backgroundColor: c.dark ? 'rgba(242,183,5,0.15)' : brand.gold100,
          borderRadius: 999,
          padding: 6,
          paddingHorizontal: 8,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: brand.gold400, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 22 }}>⭐</Text>
        </View>
        <View style={{ flex: 1 }}>
          <T size={16} w="semibold" color={c.dark ? brand.gold300 : brand.gold800}>
            {t('landing.childLogin')}
          </T>
        </View>
        <Forward size={22} color={c.dark ? brand.gold300 : brand.gold800} />
      </Pressable>
    </View>
  );

  const demo = (
    <Card style={{ borderRadius: R.hero, padding: L.tablet ? 28 : 20, flex: L.tablet ? 1 : undefined }}>
      <Row justify="space-between">
        <Row gap={12}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: brand.sky100, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 28 }}>🦅</Text>
          </View>
          <View>
            <T display size={24}>
              {t('child.hello')}
            </T>
            <T size={13} color={c.muted}>
              {t('progress.weekly')}
            </T>
          </View>
        </Row>
        <TrophyMark size={48} />
      </Row>
      <MedalTrack percent={p} levels={DEMO_LEVELS} size="lg" style={{ marginTop: 12 }} />
      <Row justify="space-between">
        <LevelBadge level={p >= 90 ? DEMO_LEVELS[2] : DEMO_LEVELS[0]} />
        <T size={24} w="semibold">{`${p}%`}</T>
      </Row>
    </Card>
  );

  const steps = [
    { icon: <KeyRound size={28} color={brand.sky500} />, title: t('landing.how1Title'), body: t('landing.how1Body') },
    { icon: <Sparkles size={28} color={brand.gold600} />, title: t('landing.how2Title'), body: t('landing.how2Body') },
    { icon: <TrophyMark size={30} />, title: t('landing.how3Title'), body: t('landing.how3Body') },
  ];

  return (
    <PublicShell>
      <ScrollView contentContainerStyle={{ paddingHorizontal: L.gutter, paddingBottom: insets.bottom + 32 }}>
        <View style={{ maxWidth: 1180, width: '100%', alignSelf: 'center', gap: 32 }}>
          <View style={{ flexDirection: L.tablet ? dir.row : 'column', gap: L.tablet ? 40 : 24, alignItems: L.tablet ? 'center' : 'stretch', paddingTop: L.tablet ? 32 : 12 }}>
            {intro}
            {demo}
          </View>

          <View style={{ gap: 14 }}>
            <T size={22} w="bold" accessibilityRole="header">
              {t('landing.howTitle')}
            </T>
            <Grid cols={L.cols(1, 3)} gap={16}>
              {steps.map((s) => (
                <View key={s.title} style={{ borderColor: c.dark ? brand.plum700 : brand.plum200, [dir.rtl ? 'borderRightWidth' : 'borderLeftWidth']: 4, paddingHorizontal: 14, gap: 6 }}>
                  <View style={{ alignItems: dir.alignStart }}>{s.icon}</View>
                  <T size={17} w="semibold">
                    {s.title}
                  </T>
                  <T color={c.muted}>{s.body}</T>
                </View>
              ))}
            </Grid>
          </View>

          <View style={{ backgroundColor: brand.plum900, borderRadius: R.hero, padding: L.tablet ? 32 : 22, gap: 14 }}>
            <Row gap={8}>
              <ShieldCheck size={24} color={brand.gold300} />
              <T size={19} w="semibold" color="#fff">
                {t('landing.valuesTitle')}
              </T>
            </Row>
            <Grid cols={L.cols(1, 3)} gap={12}>
              {[t('landing.values1'), t('landing.values2'), t('landing.values3')].map((v) => (
                <Row key={v} gap={8} align="flex-start">
                  <HeartHandshake size={20} color={brand.rose500} style={{ marginTop: 3 }} />
                  <View style={{ flex: 1 }}>
                    <T color={brand.plum100}>{v}</T>
                  </View>
                </Row>
              ))}
            </Grid>
          </View>

          <Row justify="space-between" wrap gap={8}>
            <T size={13} color={c.muted}>
              {t('app.tagline')}
            </T>
            <T size={13} color={c.primaryText} onPress={() => router.push('/privacy')} accessibilityRole="link">
              {t('landing.privacy')}
            </T>
          </Row>
        </View>
      </ScrollView>
    </PublicShell>
  );
}
