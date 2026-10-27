import * as React from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import LayoutGrid from 'lucide-react-native/icons/layout-grid';
import LogOut from 'lucide-react-native/icons/log-out';
import Languages from 'lucide-react-native/icons/languages';
import Moon from 'lucide-react-native/icons/moon';
import Sun from 'lucide-react-native/icons/sun';
import { setLanguage, useDir } from '@/i18n';
import { formatNumber } from '@/lib/dates';
import { useLayout } from '@/lib/layout';
import { brand, F, R, useTheme } from '@/lib/theme';
import { TrophyMark } from './brand';
import { DemoBanner } from './shell';
import { FONT_SCALE_CAP, Grid, Row, Sheet, T } from './ui';

export type NavItem = { href: string; label: string; short?: string; icon: LucideIcon; badge?: number; exact?: boolean };
export type NavGroup = { label: string; items: NavItem[] };

function isActive(pathname: string, it: NavItem) {
  return it.exact ? pathname === it.href || pathname === `${it.href}/` : pathname === it.href || pathname.startsWith(`${it.href}/`);
}

const tap = () => {
  if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => {});
};

function BadgeDot({ n }: { n: number }) {
  const { i18n } = useTranslation();
  return (
    <View style={{ minWidth: 18, paddingHorizontal: 5, height: 18, borderRadius: 9, backgroundColor: brand.rose500, alignItems: 'center', justifyContent: 'center' }}>
      <Text maxFontSizeMultiplier={1} style={{ fontFamily: F.bold, fontSize: 10.5, color: '#fff' }}>
        {formatNumber(n, i18n.language)}
      </Text>
    </View>
  );
}

/** Material-style destination: icon inside a pill indicator, label underneath. */
function Destination({ it, active, onPress, big, fill }: { it: NavItem; active: boolean; onPress: () => void; big?: boolean; fill?: boolean }) {
  const { c } = useTheme();
  const dir = useDir();
  const Icon = it.icon;
  const pill = c.dark ? 'rgba(154,118,240,0.28)' : brand.plum100;
  const on = c.dark ? brand.plum200 : brand.plum700;
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      android_ripple={{ color: 'rgba(109,63,214,0.12)', borderless: true, radius: 40 }}
      accessibilityRole="tab"
      accessibilityLabel={it.label}
      accessibilityState={{ selected: active }}
      style={{ alignItems: 'center', gap: 4, paddingVertical: big ? 10 : 6, flex: fill ? 1 : undefined }}
    >
      <View style={{ width: big ? 72 : 60, height: big ? 40 : 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? pill : 'transparent' }}>
        <Icon size={big ? 30 : 23} color={active ? on : c.muted} strokeWidth={active ? 2.3 : 1.9} />
        {!!it.badge && (
          <View style={{ position: 'absolute', top: -3, [dir.rtl ? 'left' : 'right']: big ? 8 : 6 }}>
            <BadgeDot n={it.badge} />
          </View>
        )}
      </View>
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={FONT_SCALE_CAP}
        style={{ fontFamily: active ? F.bold : F.medium, fontSize: big ? 13 : 11.5, color: active ? on : c.muted, textAlign: 'center' }}
      >
        {it.short ?? it.label}
      </Text>
    </Pressable>
  );
}

/** Round button with the person's emblem; opens the account sheet. */
function AccountButton({ label, emblem, onPress, size = 40 }: { label: string; emblem: React.ReactNode; onPress: () => void; size?: number }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={{ color: 'rgba(109,63,214,0.15)', borderless: true }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: c.dark ? 'rgba(154,118,240,0.25)' : brand.plum100 }}
    >
      {emblem}
    </Pressable>
  );
}

export type Account = { name: string; sub: string; emblem: React.ReactNode; onSignOut: () => void };

/**
 * The app frame — Material 3 navigation, adapted to the device:
 *  - phone: top app bar + bottom navigation bar (up to 4 destinations + «More»)
 *  - tablet (portrait and landscape): navigation rail on the start side (+ «More»)
 * Everything not on the bar/rail lives in the «More» sheet as a grid of tiles.
 */
export function AppFrame({
  groups,
  primary,
  account,
  simple,
  children,
}: {
  groups: NavGroup[];
  primary: NavItem[];
  account: Account;
  simple?: boolean;
  children: React.ReactNode;
}) {
  const { c } = useTheme();
  const L = useLayout();
  const dir = useDir();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const [sheet, setSheet] = React.useState<null | 'more' | 'account'>(null);
  // close sheets whenever the page changes
  const [lastPath, setLastPath] = React.useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setSheet(null);
  }
  const go = (href: string) => router.navigate(href as never);
  const all = groups.flatMap((g) => g.items);
  const current = all.find((it) => isActive(pathname, it)) ?? primary[0];
  const inMore = !primary.some((it) => isActive(pathname, it));
  const hasMore = all.length > primary.length;
  const moreItem: NavItem = { href: '#more', label: t('common.more'), icon: LayoutGrid, badge: undefined };
  const isHome = current === all[0];

  const moreSheet = (
    <Sheet open={sheet === 'more'} onClose={() => setSheet(null)} title={t('common.more')}>
      <View style={{ gap: 18 }}>
        {groups.map((g) => (
          <View key={g.label || 'all'} style={{ gap: 10 }}>
            {!!g.label && (
              <T size={13} w="semibold" color={c.muted}>
                {g.label}
              </T>
            )}
            <Grid cols={L.tablet ? 4 : 3} gap={10}>
              {g.items.map((it) => {
                const active = isActive(pathname, it);
                const Icon = it.icon;
                return (
                  <Pressable
                    key={it.href}
                    onPress={() => {
                      tap();
                      go(it.href);
                    }}
                    android_ripple={{ color: 'rgba(109,63,214,0.12)' }}
                    accessibilityRole="link"
                    style={({ pressed }) => ({
                      alignItems: 'center',
                      gap: 8,
                      paddingVertical: 14,
                      paddingHorizontal: 6,
                      borderRadius: R.card,
                      backgroundColor: active ? (c.dark ? 'rgba(154,118,240,0.25)' : brand.plum100) : pressed ? c.surface2 : c.dark ? c.surface2 : brand.plum50,
                    })}
                  >
                    <View>
                      <Icon size={26} color={c.dark ? brand.plum200 : brand.plum600} />
                      {!!it.badge && (
                        <View style={{ position: 'absolute', top: -6, [dir.rtl ? 'left' : 'right']: -12 }}>
                          <BadgeDot n={it.badge} />
                        </View>
                      )}
                    </View>
                    <T size={12.5} w="medium" align="center" numberOfLines={2}>
                      {it.label}
                    </T>
                  </Pressable>
                );
              })}
            </Grid>
          </View>
        ))}
      </View>
    </Sheet>
  );

  const accountSheet = (
    <Sheet open={sheet === 'account'} onClose={() => setSheet(null)} title={account.name} description={account.sub}>
      <AccountActions onSignOut={account.onSignOut} />
    </Sheet>
  );

  // ---------- tablet: navigation rail
  if (L.tablet) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <DemoBanner />
        <View style={{ flex: 1, flexDirection: dir.row }}>
          <View
            style={{
              width: 96,
              backgroundColor: c.dark ? '#1B1533' : '#F6F1FF',
              paddingTop: insets.top + 18,
              paddingBottom: insets.bottom + 18,
              alignItems: 'center',
            }}
          >
            <TrophyMark size={40} />
            <ScrollView style={{ flex: 1, alignSelf: 'stretch' }} contentContainerStyle={{ paddingTop: 28, gap: 10 }} showsVerticalScrollIndicator={false}>
              {primary.map((it) => (
                <Destination key={it.href} it={it} active={isActive(pathname, it)} onPress={() => go(it.href)} big={simple} />
              ))}
              {hasMore && <Destination it={moreItem} active={inMore} onPress={() => setSheet('more')} />}
            </ScrollView>
            <AccountButton label={account.name} emblem={account.emblem} onPress={() => setSheet('account')} size={48} />
          </View>
          <View style={{ flex: 1, paddingTop: insets.top }}>
            {!isHome && (
              <View style={{ paddingHorizontal: L.gutter, paddingTop: 18, paddingBottom: 4 }}>
                <T size={28} w="bold" accessibilityRole="header">
                  {current.label}
                </T>
              </View>
            )}
            {children}
          </View>
        </View>
        {moreSheet}
        {accountSheet}
      </View>
    );
  }

  // ---------- phone: top app bar + bottom navigation bar
  const bar = hasMore ? [...primary.slice(0, 4), moreItem] : primary;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <DemoBanner />
      <View style={{ paddingTop: insets.top, backgroundColor: c.bg }}>
        <Row justify="space-between" style={{ paddingHorizontal: 16, height: 60 }}>
          {isHome ? (
            <Row gap={10}>
              <TrophyMark size={34} />
              <T display size={24} color={c.dark ? brand.plum200 : brand.plum600}>
                {t('app.name')}
              </T>
            </Row>
          ) : (
            <T size={22} w="bold" accessibilityRole="header" numberOfLines={1}>
              {current.label}
            </T>
          )}
          <AccountButton label={account.name} emblem={account.emblem} onPress={() => setSheet('account')} />
        </Row>
      </View>
      <View style={{ flex: 1 }}>{children}</View>
      <View
        style={{
          flexDirection: dir.row,
          backgroundColor: c.dark ? '#1B1533' : '#F6F1FF',
          paddingBottom: Math.max(insets.bottom, 6),
          paddingTop: 6,
        }}
      >
        {bar.map((it) =>
          it === moreItem ? (
            <Destination key="more" it={it} active={inMore} onPress={() => setSheet('more')} fill />
          ) : (
            <Destination key={it.href} it={it} active={isActive(pathname, it)} onPress={() => go(it.href)} big={simple} fill />
          ),
        )}
      </View>
      {moreSheet}
      {accountSheet}
    </View>
  );
}

/** Language, theme and sign-out as large, labelled rows (app settings style). */
function AccountActions({ onSignOut }: { onSignOut: () => void }) {
  const { c, toggle } = useTheme();
  const { t, i18n } = useTranslation();
  const row = (icon: React.ReactNode, label: string, onPress: () => void, danger?: boolean) => (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: 'rgba(109,63,214,0.12)' }}
      accessibilityRole="button"
      style={({ pressed }) => ({ borderRadius: R.card, backgroundColor: pressed ? c.surface2 : c.dark ? c.surface2 : brand.plum50, paddingHorizontal: 16, paddingVertical: 14 })}
    >
      <Row gap={14}>
        {icon}
        <View style={{ flex: 1 }}>
          <T size={16} w="medium" color={danger ? brand.red600 : c.fg}>
            {label}
          </T>
        </View>
      </Row>
    </Pressable>
  );
  return (
    <View style={{ gap: 10, paddingBottom: 6 }}>
      {row(<Languages size={22} color={c.primaryText} />, i18n.language === 'en' ? 'العربية' : 'English', () => setLanguage(i18n.language === 'en' ? 'ar' : 'en'))}
      {row(c.dark ? <Sun size={22} color={c.primaryText} /> : <Moon size={22} color={c.primaryText} />, c.dark ? t('common.themeLight') : t('common.themeDark'), toggle)}
      {row(<LogOut size={22} color={brand.red600} />, t('common.signOut'), onSignOut, true)}
    </View>
  );
}
