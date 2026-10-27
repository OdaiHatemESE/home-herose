import * as React from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Check from 'lucide-react-native/icons/check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import X from 'lucide-react-native/icons/x';
import { useTranslation } from 'react-i18next';
import { useDir } from '@/i18n';
import { brand, F, R, shadow, useTheme } from '@/lib/theme';
import { useLayout } from '@/lib/layout';

/* ------------------------------------------------------------------ text */

/** Larger system text is honoured up to +15%; beyond that, designed layouts break (e.g. words split across lines). */
export const FONT_SCALE_CAP = 1.15;

type Weight = 'regular' | 'medium' | 'semibold' | 'bold';

export function T({
  children,
  size = 15,
  w = 'regular',
  color,
  align = 'start',
  display,
  ltr,
  style,
  numberOfLines,
  onPress,
  accessibilityRole,
}: {
  children: React.ReactNode;
  size?: number;
  w?: Weight;
  color?: string;
  align?: 'start' | 'center' | 'end';
  display?: boolean;
  ltr?: boolean;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  onPress?: () => void;
  accessibilityRole?: 'header' | 'link' | 'text' | 'alert';
}) {
  const { c } = useTheme();
  const dir = useDir();
  const textAlign = align === 'center' ? 'center' : align === 'start' ? (ltr ? 'left' : dir.textAlign) : ltr ? 'right' : dir.rtl ? 'left' : 'right';
  return (
    <Text
      onPress={onPress}
      maxFontSizeMultiplier={FONT_SCALE_CAP}
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole}
      style={[
        {
          fontFamily: display ? F.display : F[w],
          fontSize: size,
          lineHeight: Math.round(size * (display ? 1.35 : 1.55)),
          color: color ?? c.fg,
          textAlign,
          writingDirection: ltr ? 'ltr' : dir.writingDirection,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/* ------------------------------------------------------------------ layout */

export function Row({
  children,
  gap = 0,
  align = 'center',
  justify = 'flex-start',
  wrap,
  style,
}: {
  children: React.ReactNode;
  gap?: number;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const dir = useDir();
  return <View style={[{ flexDirection: dir.row, alignItems: align, justifyContent: justify, gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

/** Equal-width grid that turns into a single column on phones (cols = 1). */
export function Grid({ children, cols, gap = 12 }: { children: React.ReactNode; cols: number; gap?: number }) {
  const dir = useDir();
  const items = React.Children.toArray(children).filter(Boolean);
  if (cols <= 1) return <View style={{ gap }}>{items}</View>;
  const rows: React.ReactNode[][] = [];
  items.forEach((it, i) => {
    if (i % cols === 0) rows.push([]);
    rows[rows.length - 1].push(it);
  });
  return (
    <View style={{ gap }}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: dir.row, gap, alignItems: 'stretch' }}>
          {r.map((cell, j) => (
            <View key={j} style={{ flex: 1, minWidth: 0 }}>
              {cell}
            </View>
          ))}
          {Array.from({ length: cols - r.length }, (_, k) => (
            <View key={`pad-${k}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

export function Card({ children, style, padded = true, raised = true, tone }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean; raised?: boolean; tone?: string }) {
  const { c } = useTheme();
  return (
    <View
      style={[
        { backgroundColor: tone ?? c.surface, borderRadius: R.card, borderWidth: 1, borderColor: c.border, padding: padded ? 16 : 0 },
        raised && !c.dark ? shadow.soft : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Scrollable page body with pull-to-refresh, centred and width-capped on tablets. */
export function Screen({
  children,
  onRefresh,
  maxWidth = 1100,
  padTop = true,
  bottomInset = 24,
  background,
}: {
  children: React.ReactNode;
  onRefresh?: () => Promise<unknown>;
  maxWidth?: number;
  padTop?: boolean;
  bottomInset?: number;
  background?: string;
}) {
  const { c } = useTheme();
  const L = useLayout();
  const [refreshing, setRefreshing] = React.useState(false);
  const refresh = onRefresh
    ? async () => {
        setRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
        }
      }
    : undefined;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: background ?? c.bg }}
      contentContainerStyle={{ paddingHorizontal: L.gutter, paddingTop: padTop ? (L.tablet ? 28 : 16) : 0, paddingBottom: bottomInset }}
      keyboardShouldPersistTaps="handled"
      refreshControl={refresh ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} colors={[brand.plum500]} /> : undefined}
    >
      <View style={{ width: '100%', maxWidth, alignSelf: 'center' }}>{children}</View>
    </ScrollView>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  const { c } = useTheme();
  const L = useLayout();
  return (
    <View style={{ marginBottom: 20, gap: 12 }}>
      <Row justify="space-between" align="flex-end" wrap gap={12}>
        <View style={{ flexShrink: 1, minWidth: 0, gap: 2 }}>
          <T size={L.tablet ? 28 : 23} w="bold" accessibilityRole="header">
            {title}
          </T>
          {!!description && <T color={c.muted}>{description}</T>}
        </View>
        {actions}
      </Row>
    </View>
  );
}

export function SectionTitle({ children, action }: { children: string; action?: React.ReactNode }) {
  return (
    <Row justify="space-between" style={{ marginBottom: 10 }}>
      <T size={18} w="bold" accessibilityRole="header">
        {children}
      </T>
      {action}
    </Row>
  );
}

/* ------------------------------------------------------------------ buttons */

type Variant = 'primary' | 'gold' | 'soft' | 'outline' | 'ghost' | 'success' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'xl';

export function Btn({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  disabled,
  block,
  label,
  style,
}: {
  children?: React.ReactNode;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: (color: string, size: number) => React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  block?: boolean;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const dir = useDir();
  const v: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: brand.plum500, fg: '#fff' },
    gold: { bg: brand.gold400, fg: brand.plum900 },
    soft: { bg: c.dark ? 'rgba(109,63,214,0.25)' : brand.plum100, fg: c.dark ? brand.plum200 : brand.plum700 },
    outline: { bg: c.surface, fg: c.fg, border: c.border },
    ghost: { bg: 'transparent', fg: c.fg },
    success: { bg: brand.leaf500, fg: '#fff' },
    danger: { bg: brand.red600, fg: '#fff' },
  };
  const h = { sm: 36, md: 44, lg: 50, xl: 58 }[size];
  const fs = { sm: 13, md: 15, lg: 16, xl: 18 }[size];
  const iconSize = { sm: 16, md: 18, lg: 20, xl: 22 }[size];
  const tone = v[variant];
  const off = disabled || loading;
  return (
    <Pressable
      onPress={off ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={({ pressed }) => [
        {
          minHeight: h,
          paddingHorizontal: children ? (size === 'sm' ? 12 : 18) : 0,
          width: children ? undefined : h,
          borderRadius: size === 'xl' ? R.card : R.control,
          backgroundColor: tone.bg,
          borderWidth: tone.border ? 1 : 0,
          borderColor: tone.border,
          flexDirection: dir.row,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: off ? 0.55 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          alignSelf: block ? 'stretch' : undefined,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={tone.fg} size="small" /> : icon?.(tone.fg, iconSize)}
      {typeof children === 'string' ? (
        <T size={fs} w="semibold" color={tone.fg} align="center">
          {children}
        </T>
      ) : (
        children
      )}
    </Pressable>
  );
}

export function IconBtn({ onPress, label, children, size = 40, tone }: { onPress: () => void; label: string; children: React.ReactNode; size?: number; tone?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? 'rgba(109,63,214,0.12)' : tone ?? 'transparent' })}
    >
      {children}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ form controls */

export function Field({ label, hint, error, children, style }: { label: string; hint?: string; error?: string | null; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[{ gap: 6 }, style]}>
      <T size={14} w="medium">
        {label}
      </T>
      {children}
      {!!hint && !error && (
        <T size={12.5} color={c.muted}>
          {hint}
        </T>
      )}
      {!!error && (
        <T size={12.5} color={brand.red600} accessibilityRole="alert">
          {error}
        </T>
      )}
    </View>
  );
}

export const Input = React.forwardRef<TextInput, TextInputProps & { ltr?: boolean; invalid?: boolean; big?: boolean; center?: boolean; trailing?: React.ReactNode }>(
  function Input({ ltr, invalid, big, center, trailing, style, ...props }, ref) {
    const { c } = useTheme();
    const dir = useDir();
    const [focused, setFocused] = React.useState(false);
    return (
      <View
        style={{
          flexDirection: dir.row,
          alignItems: 'center',
          minHeight: big ? 54 : 46,
          borderRadius: R.control,
          borderWidth: focused ? 2 : 1,
          borderColor: invalid ? brand.red600 : focused ? brand.plum500 : c.border,
          backgroundColor: c.surface,
          paddingHorizontal: focused ? 13 : 14,
        }}
      >
        <TextInput
          ref={ref}
          maxFontSizeMultiplier={FONT_SCALE_CAP}
          placeholderTextColor={c.muted}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[
            {
              flex: 1,
              minWidth: 0,
              paddingVertical: Platform.OS === 'web' ? 12 : 8,
              fontFamily: F.regular,
              fontSize: big ? 18 : 15.5,
              color: c.fg,
              textAlign: center ? 'center' : ltr ? 'left' : dir.textAlign,
              writingDirection: ltr ? 'ltr' : dir.writingDirection,
            },
            Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null,
            style,
          ]}
          {...props}
        />
        {trailing}
      </View>
    );
  },
);

export function PasswordInput(props: TextInputProps & { ltr?: boolean; invalid?: boolean; big?: boolean }) {
  const [show, setShow] = React.useState(false);
  const { c } = useTheme();
  const { t } = useTranslation();
  return (
    <Input
      {...props}
      secureTextEntry={!show}
      autoCapitalize="none"
      autoCorrect={false}
      trailing={
        <IconBtn onPress={() => setShow((s) => !s)} label={t('auth.password')} size={36}>
          {show ? <EyeOff size={20} color={c.muted} /> : <Eye size={20} color={c.muted} />}
        </IconBtn>
      }
    />
  );
}

export type Option<V extends string> = { value: V; label: string };

/** A select that works the same on phones, tablets and the web: tapping opens a list sheet. */
export function Select<V extends string>({ value, options, onChange, label, ltr }: { value: V; options: Option<V>[]; onChange: (v: V) => void; label: string; ltr?: boolean }) {
  const { c } = useTheme();
  const dir = useDir();
  const [open, setOpen] = React.useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label ?? ''}`}
        style={{ flexDirection: dir.row, alignItems: 'center', minHeight: 46, borderRadius: R.control, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, paddingHorizontal: 14, gap: 8 }}
      >
        <View style={{ flex: 1 }}>
          <T ltr={ltr} numberOfLines={1}>
            {current?.label ?? '—'}
          </T>
        </View>
        <ChevronDown size={18} color={c.muted} />
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        <View style={{ gap: 4 }}>
          {options.map((o) => {
            const active = o.value === value;
            return (
              <Pressable
                key={o.value}
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                style={({ pressed }) => ({
                  flexDirection: dir.row,
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderRadius: R.control,
                  backgroundColor: active ? (c.dark ? 'rgba(109,63,214,0.3)' : brand.plum50) : pressed ? c.surface2 : 'transparent',
                })}
              >
                <View style={{ flex: 1 }}>
                  <T w={active ? 'semibold' : 'regular'} ltr={ltr}>
                    {o.label}
                  </T>
                </View>
                {active && <Check size={18} color={c.primary} />}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </>
  );
}

export function Toggle({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }} accessibilityLabel={label}>
      <Row gap={12} justify="space-between">
        <View style={{ flex: 1 }}>
          <T size={14.5}>{label}</T>
          {!!hint && (
            <T size={12.5} color={c.muted}>
              {hint}
            </T>
          )}
        </View>
        <Switch value={value} onValueChange={onChange} trackColor={{ true: brand.plum500, false: c.border }} thumbColor="#fff" />
      </Row>
    </Pressable>
  );
}

export function CheckBox({ checked, onChange, label, big, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode; big?: boolean; disabled?: boolean }) {
  const { c } = useTheme();
  const box = big ? 28 : 22;
  return (
    <Pressable
      onPress={disabled ? undefined : () => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      style={{ opacity: disabled ? 0.6 : 1 }}
    >
      <Row gap={10} align="center">
        <View
          style={{
            width: box,
            height: box,
            borderRadius: 7,
            borderWidth: 2,
            borderColor: checked ? brand.plum500 : c.border,
            backgroundColor: checked ? brand.plum500 : c.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {checked && <Check size={box - 8} color="#fff" strokeWidth={3} />}
        </View>
        <View style={{ flex: 1 }}>{typeof label === 'string' ? <T size={big ? 17 : 15}>{label}</T> : label}</View>
      </Row>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ feedback */

type BadgeTone = 'green' | 'gold' | 'blue' | 'pink' | 'purple' | 'muted';
export function Badge({ tone, children, icon }: { tone: BadgeTone; children: React.ReactNode; icon?: (color: string) => React.ReactNode }) {
  const { c } = useTheme();
  const tones: Record<BadgeTone, { bg: string; fg: string }> = {
    green: { bg: brand.leaf500, fg: '#fff' },
    gold: { bg: c.dark ? 'rgba(242,183,5,0.15)' : brand.gold100, fg: c.dark ? brand.gold300 : brand.gold800 },
    blue: { bg: c.dark ? 'rgba(47,123,234,0.18)' : brand.sky100, fg: brand.sky500 },
    pink: { bg: c.dark ? 'rgba(240,90,155,0.18)' : brand.rose100, fg: brand.rose500 },
    purple: { bg: c.dark ? 'rgba(109,63,214,0.25)' : brand.plum100, fg: c.dark ? brand.plum200 : brand.plum700 },
    muted: { bg: c.surface2, fg: c.muted },
  };
  const tn = tones[tone];
  const dir = useDir();
  return (
    <Row gap={4} style={{ backgroundColor: tn.bg, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, alignSelf: dir.alignStart }}>
      {icon?.(tn.fg)}
      {typeof children === 'string' || typeof children === 'number' ? (
        <T size={12.5} w="semibold" color={tn.fg}>
          {children}
        </T>
      ) : (
        children
      )}
    </Row>
  );
}

export function Skeleton({ height = 64, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const [v] = React.useState(() => new Animated.Value(0.5));
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(v, { toValue: 0.5, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View style={[{ height, borderRadius: R.card, backgroundColor: c.surface2, opacity: v }, style]} />;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { c } = useTheme();
  const { t } = useTranslation();
  return (
    <View
      accessibilityRole="alert"
      style={{
        borderRadius: R.card,
        borderWidth: 1,
        borderColor: c.dark ? 'rgba(239,68,68,0.3)' : brand.red200,
        backgroundColor: c.dark ? 'rgba(239,68,68,0.1)' : brand.red50,
        padding: 14,
        gap: 6,
      }}
    >
      <T size={14} color={c.dark ? '#FECACA' : brand.red800}>
        {message}
      </T>
      {onRetry && (
        <T size={14} w="semibold" color={c.dark ? '#FECACA' : brand.red800} onPress={onRetry} accessibilityRole="link" style={{ textDecorationLine: 'underline' }}>
          {t('common.retry')}
        </T>
      )}
    </View>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: string; title: string; description?: string; action?: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 10, borderRadius: R.card, borderWidth: 2, borderStyle: 'dashed', borderColor: c.border, paddingVertical: 36, paddingHorizontal: 20 }}>
      {!!icon && <Text style={{ fontSize: 38 }}>{icon}</Text>}
      <T w="semibold" align="center">
        {title}
      </T>
      {!!description && (
        <T size={14} color={c.muted} align="center">
          {description}
        </T>
      )}
      {action}
    </View>
  );
}

export function ProgressBar({ value, color = brand.leaf500, height = 10, label }: { value: number; color?: string; height?: number; label?: string }) {
  const { c } = useTheme();
  const dir = useDir();
  const p = Math.max(0, Math.min(100, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(p) }}
      style={{ height, borderRadius: 999, backgroundColor: c.surface2, overflow: 'hidden', flexDirection: dir.row }}
    >
      <View style={{ width: `${p}%`, backgroundColor: color, borderRadius: 999 }} />
    </View>
  );
}

/* ------------------------------------------------------------------ sheet / dialog */

/** Bottom sheet on phones, centred dialog on tablets and wide screens. */
export function Sheet({ open, onClose, title, description, children, footer }: { open: boolean; onClose: () => void; title: string; description?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  const { c } = useTheme();
  const L = useLayout();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const asDialog = L.tablet;
  return (
    <Modal visible={open} transparent animationType={asDialog ? 'fade' : 'slide'} onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: c.overlay, justifyContent: asDialog ? 'center' : 'flex-end', alignItems: 'center', padding: asDialog ? 24 : 0 }}>
          <Pressable style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} onPress={onClose} accessibilityLabel={t('common.close')} />
          <View
            accessibilityViewIsModal
            style={{
              width: '100%',
              maxWidth: asDialog ? 520 : undefined,
              maxHeight: asDialog ? '88%' : '92%',
              backgroundColor: c.surface,
              borderTopLeftRadius: R.hero,
              borderTopRightRadius: R.hero,
              borderBottomLeftRadius: asDialog ? R.hero : 0,
              borderBottomRightRadius: asDialog ? R.hero : 0,
              paddingBottom: asDialog ? 8 : insets.bottom + 8,
              ...shadow.lift,
            }}
          >
            {!asDialog && <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.border, marginTop: 8 }} />}
            <Row justify="space-between" align="flex-start" gap={12} style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <T size={19} w="bold" accessibilityRole="header">
                  {title}
                </T>
                {!!description && (
                  <T size={14} color={c.muted}>
                    {description}
                  </T>
                )}
              </View>
              <IconBtn onPress={onClose} label={t('common.close')} size={36}>
                <X size={20} color={c.muted} />
              </IconBtn>
            </Row>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
            {footer && <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 8 }}>{footer}</View>}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Divider() {
  const { c } = useTheme();
  return <View style={{ height: 1, backgroundColor: c.border, marginVertical: 12 }} />;
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ borderRadius: R.control, backgroundColor: c.surface2, paddingHorizontal: 8, paddingVertical: 10, gap: 2, flex: 1, minWidth: 0 }}>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} maxFontSizeMultiplier={FONT_SCALE_CAP} style={{ fontFamily: F.regular, fontSize: 12, color: c.muted, textAlign: 'center' }}>
        {label}
      </Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <T size={18} w="bold" align="center" numberOfLines={1}>
          {value}
        </T>
      ) : (
        value
      )}
      {!!sub && (
        <T size={12} color={c.muted} align="center">
          {sub}
        </T>
      )}
    </View>
  );
}
