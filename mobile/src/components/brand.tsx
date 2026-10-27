import * as React from 'react';
import { Animated, Easing, Platform, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Path, Rect, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import Star from 'lucide-react-native/icons/star';
import type { AchievementLevel } from '@shared/lib/database.types';
import { formatNumber } from '@/lib/dates';
import { useDir } from '@/i18n';
import { avatarEmoji, colorStyle } from '@/lib/icons';
import { brand, useTheme } from '@/lib/theme';
import { Row, T } from './ui';

/** Trophy emblem with a star — the Home Heroes mark. */
export function TrophyMark({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <SvgGradient id="hh-cup" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFD54A" />
          <Stop offset="1" stopColor="#E09E00" />
        </SvgGradient>
      </Defs>
      <Path d="M18 12h28v12c0 9-6 16-14 16s-14-7-14-16V12Z" fill="url(#hh-cup)" />
      <Path d="M18 16H11c0 8 3 13 9 14M46 16h7c0 8-3 13-9 14" fill="none" stroke="#E09E00" strokeWidth={4} strokeLinecap="round" />
      <Path d="M28 40h8v8h-8z" fill="#C98A00" />
      <Rect x={20} y={48} width={24} height={7} rx={3} fill="#6D3FD6" />
      <Path d="m32 17 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8Z" fill="#fff" />
    </Svg>
  );
}

export function Logo({ compact, light }: { compact?: boolean; light?: boolean }) {
  const { c } = useTheme();
  return (
    <Row gap={10}>
      <TrophyMark size={36} />
      {!compact && (
        <View>
          <T display size={22} color={light ? '#fff' : c.dark ? brand.plum200 : brand.plum600} style={{ lineHeight: 28 }}>
            أبطال البيت
          </T>
          <T size={11} w="medium" color={light ? 'rgba(255,255,255,0.75)' : c.muted} ltr style={{ lineHeight: 14 }}>
            Home Heroes
          </T>
        </View>
      )}
    </Row>
  );
}

const AVATAR_SIZES = { sm: 32, md: 44, lg: 64, xl: 96 };

export function ChildAvatar({ avatar, color, size = 'md', ring }: { avatar: string; color: string; size?: keyof typeof AVATAR_SIZES; ring?: string }) {
  const { c } = useTheme();
  const tone = colorStyle(color, c);
  const s = AVATAR_SIZES[size];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: s, height: s, borderRadius: s / 2, backgroundColor: tone.tileBg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: ring ?? (c.dark ? brand.plum950 : '#fff') }}
    >
      <Text style={{ fontSize: s * 0.48 }}>{avatarEmoji(avatar)}</Text>
    </View>
  );
}

export function StarTally({ regular, golden, size = 16 }: { regular: number; golden?: number; size?: number }) {
  const { t, i18n } = useTranslation();
  const { c } = useTheme();
  return (
    <View accessible accessibilityLabel={t('stars.tally', { regular, golden: golden ?? 0 })}>
      <Row gap={12}>
        <Row gap={4}>
          <Star size={size + 2} color={brand.plum400} fill={brand.plum400} />
          <T size={size} w="semibold">
            {formatNumber(regular, i18n.language)}
          </T>
        </Row>
        {!!golden && (
          <Row gap={4}>
            <Star size={size + 2} color={brand.gold400} fill={brand.gold400} />
            <T size={size} w="semibold" color={c.dark ? brand.gold300 : brand.gold600}>
              {formatNumber(golden, i18n.language)}
            </T>
          </Row>
        )}
      </Row>
    </View>
  );
}

type LevelLike = Pick<AchievementLevel, 'code' | 'icon' | 'name_ar' | 'name_en'>;

export function levelName(level: Pick<AchievementLevel, 'name_ar' | 'name_en'> | null | undefined, lang: string) {
  if (!level) return '';
  return lang === 'en' ? level.name_en || level.name_ar : level.name_ar;
}

const LEVEL_TONES: Record<string, { from: string; to: string; fg: string }> = {
  gold: { from: brand.gold100, to: brand.gold300, fg: brand.gold800 },
  silver: { from: '#F8FAFC', to: '#E2E8F0', fg: '#334155' },
  bronze: { from: '#FFF7ED', to: '#FED7AA', fg: '#9A3412' },
  growing: { from: brand.leaf100, to: '#A7F3D0', fg: brand.emerald800 },
};

export function LevelBadge({ level, size = 'md' }: { level: LevelLike | null | undefined; size?: 'sm' | 'md' | 'lg' }) {
  const { t, i18n } = useTranslation();
  const { c } = useTheme();
  if (!level) {
    return (
      <T size={13} color={c.muted}>
        {t('levels.none')}
      </T>
    );
  }
  const tone = LEVEL_TONES[level.code] ?? { from: brand.plum100, to: brand.plum200, fg: brand.plum700 };
  const fs = size === 'sm' ? 12 : size === 'md' ? 14 : 20;
  return (
    <LinearGradient
      colors={[tone.from, tone.to]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 999, paddingHorizontal: size === 'lg' ? 16 : size === 'md' ? 12 : 8, paddingVertical: size === 'lg' ? 4 : 2, alignSelf: 'flex-start' }}
    >
      <Row gap={6}>
        <Text style={{ fontSize: fs }}>{level.icon}</Text>
        <T size={fs} display={size === 'lg'} w={size === 'lg' ? 'regular' : 'semibold'} color={tone.fg} numberOfLines={1}>
          {levelName(level, i18n.language)}
        </T>
      </Row>
    </LinearGradient>
  );
}

const MEDAL_FILL: Record<string, [string, string, string]> = {
  gold: [brand.gold300, brand.gold600, brand.plum900],
  silver: ['#F1F5F9', brand.silver400, brand.plum900],
  bronze: ['#FED7AA', brand.bronze500, '#fff'],
};

/**
 * The signature progress element: a ribbon with medals pinned at each level's threshold
 * and a star marking where the child is this week. Mirrors the website's MedalTrack.
 */
export function MedalTrack({
  percent,
  levels,
  size = 'md',
  style,
}: {
  percent: number | null;
  levels: Pick<AchievementLevel, 'id' | 'code' | 'name_ar' | 'name_en' | 'icon' | 'color' | 'min_percent' | 'is_active'>[];
  size?: 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}) {
  const { t, i18n } = useTranslation();
  const { c } = useTheme();
  const dir = useDir();
  const [width, setWidth] = React.useState(0);
  const p = Math.max(0, Math.min(100, percent ?? 0));
  const [anim] = React.useState(() => new Animated.Value(0));
  React.useEffect(() => {
    Animated.timing(anim, { toValue: p, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [p, anim]);
  const big = size === 'lg';
  const barH = big ? 18 : 13;
  const starTop = 0;
  const barTop = big ? 34 : 28;
  const medal = big ? 30 : 24;
  const pins = levels.filter((l) => l.is_active && Number(l.min_percent) > 0).sort((a, b) => Number(a.min_percent) - Number(b.min_percent));
  const toX = (pct: number) => (dir.rtl ? width * (1 - pct / 100) : (width * pct) / 100);
  const fillWidth = anim.interpolate({ inputRange: [0, 100], outputRange: [0, Math.max(width, 1)] });
  const half = big ? 15 : 12;
  const starX = anim.interpolate({ inputRange: [0, 100], outputRange: dir.rtl ? [Math.max(0, width - 2 * half), 0] : [0, Math.max(0, width - 2 * half)] });

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('progress.weekly')}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(p) }}
      style={[{ height: barTop + barH + medal + 18, marginVertical: 2 }, style]}
    >
      {/* ribbon */}
      <View style={{ position: 'absolute', top: barTop, left: 0, right: 0, height: barH, borderRadius: 999, backgroundColor: c.dark ? 'rgba(154,118,240,0.22)' : brand.plum100, overflow: 'hidden' }}>
        <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, [dir.rtl ? 'right' : 'left']: 0, width: fillWidth, borderRadius: 999, overflow: 'hidden' }}>
          <LinearGradient colors={[brand.plum500, brand.rose500, brand.gold400]} locations={[0, 0.6, 1]} start={{ x: dir.rtl ? 1 : 0, y: 0 }} end={{ x: dir.rtl ? 0 : 1, y: 0 }} style={{ flex: 1 }} />
        </Animated.View>
      </View>

      {/* the child's star */}
      {width > 0 && (
        <Animated.View style={{ position: 'absolute', top: starTop, left: 0, transform: [{ translateX: starX }] }}>
          <Text style={{ fontSize: big ? 26 : 21 }}>⭐</Text>
        </Animated.View>
      )}

      {/* medals pinned at thresholds */}
      {width > 0 &&
        pins.map((l) => {
          const min = Number(l.min_percent);
          const reached = p >= min;
          const fill = MEDAL_FILL[l.code];
          const x = toX(min);
          return (
            <View key={l.id} style={{ position: 'absolute', top: barTop - (medal - barH) / 2, left: x - medal / 2, width: medal, alignItems: 'center' }}>
              <View
                accessibilityLabel={i18n.language === 'ar' ? l.name_ar : l.name_en || l.name_ar}
                style={{ width: medal, height: medal, borderRadius: medal / 2, borderWidth: 2, borderColor: c.dark ? '#2B2349' : '#fff', overflow: 'hidden', opacity: reached ? 1 : 0.8 }}
              >
                {reached && fill ? (
                  <LinearGradient colors={[fill[0], fill[1]]} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: medal * 0.48 }}>{l.icon}</Text>
                  </LinearGradient>
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: reached ? brand.plum500 : c.dark ? '#3A3060' : brand.plum50 }}>
                    <Text style={{ fontSize: medal * 0.48, opacity: reached ? 1 : 0.6 }}>{l.icon}</Text>
                  </View>
                )}
              </View>
              <T size={10.5} w={reached ? 'semibold' : 'regular'} color={reached ? c.fg : c.muted} align="center" style={{ marginTop: 2, width: 40 }}>
                {`${formatNumber(min, i18n.language)}%`}
              </T>
            </View>
          );
        })}
    </View>
  );
}

/** A short, colourful burst of stars — the website's confetti, made for phones and tablets. */
const CelebrateCtx = React.createContext<(kind?: 'small' | 'big') => void>(() => {});

export function CelebrateProvider({ children }: { children: React.ReactNode }) {
  const [bursts, setBursts] = React.useState<{ id: number; big: boolean }[]>([]);
  const celebrate = React.useCallback((kind: 'small' | 'big' = 'small') => {
    const id = Date.now() + Math.random();
    setBursts((b) => [...b, { id, big: kind === 'big' }]);
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1600);
  }, []);
  return (
    <CelebrateCtx.Provider value={celebrate}>
      {children}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {bursts.map((b) => (
          <Burst key={b.id} big={b.big} />
        ))}
      </View>
    </CelebrateCtx.Provider>
  );
}

export const useCelebrate = () => React.useContext(CelebrateCtx);

const COLORS = [brand.gold400, brand.plum500, brand.rose500, brand.sky500, brand.leaf500];

function Burst({ big }: { big: boolean }) {
  const count = big ? 28 : 14;
  const [pieces] = React.useState(() =>
    Array.from({ length: count }, (_, i) => ({
      angle: (Math.PI * 2 * i) / count + Math.random() * 0.4,
      dist: (big ? 160 : 100) + Math.random() * 80,
      color: COLORS[i % COLORS.length],
      star: i % 3 === 0,
    })),
  );
  const [a] = React.useState(() => new Animated.Value(0));
  React.useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 1300, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }).start();
  }, [a]);
  return (
    <View style={{ position: 'absolute', left: '50%', top: '55%' }}>
      {pieces.map((pc, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            opacity: a.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateX: a.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(pc.angle) * pc.dist] }) },
              { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(pc.angle) * pc.dist + 60] }) },
              { rotate: a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(i % 2 ? 1 : -1) * 220}deg`] }) },
            ],
          }}
        >
          {pc.star ? <Text style={{ fontSize: big ? 20 : 16 }}>⭐</Text> : <View style={{ width: 9, height: 14, borderRadius: 2, backgroundColor: pc.color }} />}
        </Animated.View>
      ))}
    </View>
  );
}
