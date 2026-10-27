import * as React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Languages from 'lucide-react-native/icons/languages';
import Moon from 'lucide-react-native/icons/moon';
import Sun from 'lucide-react-native/icons/sun';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import { setLanguage, useDir } from '@/i18n';
import { DEMO_MODE } from '@/lib/config';
import { useLayout } from '@/lib/layout';
import { brand, R, shadow, useTheme } from '@/lib/theme';
import { Logo, TrophyMark } from './brand';
import { IconBtn, Row, T } from './ui';

export function LanguageToggle({ color }: { color?: string }) {
  const { t, i18n } = useTranslation();
  const { c } = useTheme();
  return (
    <IconBtn onPress={() => setLanguage(i18n.language === 'en' ? 'ar' : 'en')} label={t('common.languageLabel')}>
      <Row gap={4}>
        <Languages size={18} color={color ?? c.muted} />
        <T size={12} w="semibold" color={color ?? c.muted}>
          {i18n.language === 'en' ? 'ع' : 'EN'}
        </T>
      </Row>
    </IconBtn>
  );
}

export function ThemeToggle({ color }: { color?: string }) {
  const { t } = useTranslation();
  const { c, toggle } = useTheme();
  return (
    <IconBtn onPress={toggle} label={c.dark ? t('common.themeLight') : t('common.themeDark')}>
      {c.dark ? <Sun size={20} color={color ?? c.muted} /> : <Moon size={20} color={color ?? c.muted} />}
    </IconBtn>
  );
}

/** Thin banner shown only in the local demo / QA build. */
export function DemoBanner() {
  const { t } = useTranslation();
  if (!DEMO_MODE) return null;
  return (
    <View style={{ backgroundColor: brand.gold400, paddingVertical: 4 }}>
      <T size={12} w="semibold" color={brand.plum900} align="center">
        {t('mobile.testBuild')}
      </T>
    </View>
  );
}

/** Public pages: logo, language and theme in a top bar. */
export function PublicShell({ children, back }: { children: React.ReactNode; back?: boolean }) {
  const { c } = useTheme();
  const L = useLayout();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dir = useDir();
  const { t } = useTranslation();
  const Back = dir.rtl ? ChevronRight : ChevronLeft;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <DemoBanner />
      <Row justify="space-between" style={{ paddingTop: insets.top + 8, paddingHorizontal: L.gutter, paddingBottom: 8, maxWidth: 1180, width: '100%', alignSelf: 'center' }}>
        <Row gap={4}>
          {back && (
            <IconBtn onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} label={t('common.back')}>
              <Back size={24} color={c.fg} />
            </IconBtn>
          )}
          <Logo />
        </Row>
        <Row gap={2}>
          <LanguageToggle />
          <ThemeToggle />
        </Row>
      </Row>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {children}
      </KeyboardAvoidingView>
    </View>
  );
}

/**
 * Sign-in style pages. Phone: a single card. Tablet: a brand panel beside the form,
 * so the larger screen feels designed rather than stretched.
 */
export function AuthLayout({ title, subtitle, children, kid }: { title: string; subtitle?: string; children: React.ReactNode; kid?: boolean }) {
  const { c } = useTheme();
  const L = useLayout();
  const { t } = useTranslation();
  const dir = useDir();
  const insets = useSafeAreaInsets();
  const card = (
    <View
      style={[
        { backgroundColor: c.surface, borderRadius: R.hero, borderWidth: 1, borderColor: c.border, padding: L.tablet ? 32 : 22, gap: 6, width: '100%' },
        !c.dark ? shadow.lift : null,
      ]}
    >
      {kid && <TrophyMark size={64} />}
      <T size={kid ? 34 : 24} w="bold" display={kid} color={kid ? (c.dark ? brand.plum200 : brand.plum600) : c.fg} accessibilityRole="header">
        {title}
      </T>
      {!!subtitle && <T color={c.muted}>{subtitle}</T>}
      <View style={{ marginTop: 16 }}>{children}</View>
    </View>
  );
  return (
    <PublicShell back>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: L.gutter, paddingVertical: L.tablet ? 32 : 16, paddingBottom: insets.bottom + 24, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        {L.tablet ? (
          <View style={{ flexDirection: dir.row, gap: 28, maxWidth: 1000, width: '100%', alignSelf: 'center', alignItems: 'stretch' }}>
            <LinearGradient
              colors={kid ? [brand.gold300, brand.gold400, '#E09E00'] : [brand.plum500, brand.plum600, brand.plum700]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1, borderRadius: R.hero, padding: 32, justifyContent: 'space-between', minHeight: 420 }}
            >
              <TrophyMark size={88} />
              <View style={{ gap: 10 }}>
                <T display size={40} color={kid ? brand.plum900 : '#fff'}>
                  {t('app.name')}
                </T>
                <T size={17} color={kid ? brand.plum900 : 'rgba(255,255,255,0.85)'}>
                  {kid ? t('landing.how2Body') : t('app.tagline')}
                </T>
              </View>
            </LinearGradient>
            <View style={{ flex: 1, justifyContent: 'center' }}>{card}</View>
          </View>
        ) : (
          <View style={{ maxWidth: 460, width: '100%', alignSelf: 'center' }}>{card}</View>
        )}
      </ScrollView>
    </PublicShell>
  );
}
