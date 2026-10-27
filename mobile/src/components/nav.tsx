import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react-native';
import Menu from 'lucide-react-native/icons/menu';
import LogOut from 'lucide-react-native/icons/log-out';
import { formatNumber } from '@shared/lib/dates';
import { useDir } from '@/i18n';
import { useLayout } from '@/lib/layout';
import { brand, R, useTheme } from '@/lib/theme';
import { Logo } from './brand';
import { DemoBanner, LanguageToggle, ThemeToggle } from './shell';
import { IconBtn, Row, Sheet, T } from './ui';

export type NavItem = { href: string; label: string; icon: LucideIcon; badge?: number; exact?: boolean };
export type NavGroup = { label: string; items: NavItem[] };

function isActive(pathname: string, it: NavItem) {
  return it.exact ? pathname === it.href || pathname === `${it.href}/` : pathname === it.href || pathname.startsWith(`${it.href}/`);
}

function BadgeDot({ n, small }: { n: number; small?: boolean }) {
  const { i18n } = useTranslation();
  return (
    <View style={{ minWidth: small ? 18 : 22, paddingHorizontal: 5, height: small ? 18 : 20, borderRadius: 10, backgroundColor: brand.gold400, alignItems: 'center', justifyContent: 'center' }}>
      <T size={small ? 10.5 : 11.5} w="bold" color={brand.plum900} align="center">
        {formatNumber(n, i18n.language)}
      </T>
    </View>
  );
}

/**
 * The adaptive app frame:
 *  - phone: top bar + bottom tab bar, everything else in a "menu" sheet
 *  - tablet portrait: a slim icon rail on the start side
 *  - tablet landscape / wide: a full sidebar with grouped sections
 */
export function AppFrame({
  groups,
  tabs,
  footer,
  header,
  simpleTabs,
  children,
}: {
  groups: NavGroup[];
  tabs: NavItem[];
  footer: React.ReactNode;
  header?: React.ReactNode;
  simpleTabs?: boolean;
  children: React.ReactNode;
}) {
  const { c } = useTheme();
  const L = useLayout();
  const dir = useDir();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const [menu, setMenu] = React.useState(false);
  // close the menu whenever the page changes
  const [lastPath, setLastPath] = React.useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMenu(false);
  }
  const go = (href: string) => router.navigate(href as never);

  const groupList = (onPick?: () => void) => (
    <View style={{ gap: 18 }}>
      {groups.map((g) => (
        <View key={g.label} style={{ gap: 2 }}>
          {!!g.label && (
            <T size={12} w="medium" color={c.muted} style={{ paddingHorizontal: 12, marginBottom: 4 }}>
              {g.label}
            </T>
          )}
          {g.items.map((it) => {
            const active = isActive(pathname, it);
            const Icon = it.icon;
            return (
              <Pressable
                key={it.href}
                onPress={() => {
                  onPick?.();
                  go(it.href);
                }}
                accessibilityRole="link"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => ({
                  flexDirection: dir.row,
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: R.control,
                  backgroundColor: active ? brand.plum500 : pressed ? c.surface2 : 'transparent',
                })}
              >
                <Icon size={19} color={active ? '#fff' : c.fg} />
                <View style={{ flex: 1 }}>
                  <T size={15} color={active ? '#fff' : c.fg} w={active ? 'semibold' : 'regular'}>
                    {it.label}
                  </T>
                </View>
                {!!it.badge && <BadgeDot n={it.badge} />}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );

  // ---------- tablet: full sidebar (wide) or icon rail (portrait)
  if (L.tablet) {
    const rail = !L.wide;
    const all = groups.flatMap((g) => g.items);
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <DemoBanner />
        <View style={{ flex: 1, flexDirection: dir.row }}>
          <View
            style={{
              width: rail ? 96 : 272,
              backgroundColor: c.surface,
              [dir.rtl ? 'borderLeftWidth' : 'borderRightWidth']: 1,
              borderColor: c.border,
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 12,
            }}
          >
            <View style={{ paddingHorizontal: rail ? 0 : 18, alignItems: rail ? 'center' : dir.alignStart, marginBottom: 18 }}>
              <Logo compact={rail} />
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: rail ? 8 : 12, gap: rail ? 6 : 0 }}>
              {rail
                ? all.map((it) => {
                    const active = isActive(pathname, it);
                    const Icon = it.icon;
                    return (
                      <Pressable
                        key={it.href}
                        onPress={() => go(it.href)}
                        accessibilityRole="link"
                        accessibilityLabel={it.label}
                        accessibilityState={{ selected: active }}
                        style={({ pressed }) => ({
                          alignItems: 'center',
                          gap: 3,
                          paddingVertical: 9,
                          borderRadius: R.control,
                          backgroundColor: active ? brand.plum500 : pressed ? c.surface2 : 'transparent',
                        })}
                      >
                        <View>
                          <Icon size={22} color={active ? '#fff' : c.fg} />
                          {!!it.badge && (
                            <View style={{ position: 'absolute', top: -8, [dir.rtl ? 'left' : 'right']: -14 }}>
                              <BadgeDot n={it.badge} small />
                            </View>
                          )}
                        </View>
                        <T size={10.5} color={active ? '#fff' : c.muted} align="center" numberOfLines={1}>
                          {it.label}
                        </T>
                      </Pressable>
                    );
                  })
                : groupList()}
            </ScrollView>
            <View style={{ borderTopWidth: 1, borderColor: c.border, paddingTop: 10, paddingHorizontal: rail ? 6 : 14 }}>
              {rail ? (
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <IconBtn onPress={() => setMenu(true)} label={t('mobile.menu')}>
                    <Menu size={22} color={c.muted} />
                  </IconBtn>
                </View>
              ) : (
                footer
              )}
            </View>
          </View>
          <View style={{ flex: 1, paddingTop: insets.top }}>
            {header && <View style={{ paddingHorizontal: L.gutter, paddingTop: 14, flexDirection: dir.row }}>{header}</View>}
            {children}
          </View>
        </View>
        <Sheet open={menu} onClose={() => setMenu(false)} title={t('mobile.menu')}>
          {footer}
        </Sheet>
      </View>
    );
  }

  // ---------- phone: top bar + bottom tabs
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <DemoBanner />
      <View style={{ paddingTop: insets.top, backgroundColor: c.surface, borderBottomWidth: 1, borderColor: c.border }}>
        <Row justify="space-between" style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
          {header ?? <Logo />}
          <IconBtn onPress={() => setMenu(true)} label={t('mobile.menu')}>
            <Menu size={24} color={c.fg} />
          </IconBtn>
        </Row>
      </View>
      <View style={{ flex: 1 }}>{children}</View>
      <View style={{ flexDirection: dir.row, backgroundColor: c.surface, borderTopWidth: 1, borderColor: c.border, paddingBottom: insets.bottom }}>
        {tabs.map((it) => {
          const active = isActive(pathname, it);
          const Icon = it.icon;
          return (
            <Pressable
              key={it.href}
              onPress={() => go(it.href)}
              accessibilityRole="tab"
              accessibilityLabel={it.label}
              accessibilityState={{ selected: active }}
              style={{ flex: 1, alignItems: 'center', paddingTop: simpleTabs ? 12 : 8, paddingBottom: simpleTabs ? 10 : 6, gap: 2 }}
            >
              <View>
                <Icon size={simpleTabs ? 32 : 24} color={active ? (c.dark ? brand.plum200 : brand.plum600) : c.muted} strokeWidth={active ? 2.4 : 2} />
                {!!it.badge && (
                  <View style={{ position: 'absolute', top: -6, [dir.rtl ? 'left' : 'right']: -14 }}>
                    <BadgeDot n={it.badge} small />
                  </View>
                )}
              </View>
              <T size={11} w={active ? 'semibold' : 'regular'} color={active ? (c.dark ? brand.plum200 : brand.plum600) : c.muted} align="center" numberOfLines={1}>
                {it.label}
              </T>
            </Pressable>
          );
        })}
      </View>
      <Sheet open={menu} onClose={() => setMenu(false)} title={t('mobile.menu')}>
        <View style={{ gap: 16 }}>
          {groupList(() => setMenu(false))}
          <View style={{ borderTopWidth: 1, borderColor: c.border, paddingTop: 12 }}>{footer}</View>
        </View>
      </Sheet>
    </View>
  );
}

/** Name, family, language, theme and sign-out — shown in the sidebar footer or the menu sheet. */
export function AccountFooter({ name, sub, onSignOut }: { name: string; sub: string; onSignOut: () => void }) {
  const { c } = useTheme();
  const { t } = useTranslation();
  const dir = useDir();
  return (
    <View style={{ gap: 6 }}>
      <View style={{ paddingHorizontal: 4 }}>
        <T w="medium">{name}</T>
        <T size={13} color={c.muted}>
          {sub}
        </T>
      </View>
      <Row gap={2}>
        <LanguageToggle />
        <ThemeToggle />
        <View style={{ flex: 1 }} />
        <IconBtn onPress={onSignOut} label={t('common.signOut')}>
          <LogOut size={20} color={c.muted} style={{ transform: [{ scaleX: dir.rtl ? -1 : 1 }] }} />
        </IconBtn>
      </Row>
    </View>
  );
}
