import * as React from 'react';
import { Animated, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { brand, R, shadow } from '@/lib/theme';
import { T } from './ui';

type Toast = { id: number; kind: 'success' | 'error' | 'info'; message: string };
type Ctx = { show: (kind: Toast['kind'], message: string) => void };
const ToastCtx = React.createContext<Ctx>({ show: () => {} });

let external: Ctx['show'] | null = null;
/** Usable outside React components (data-layer mutations). */
export const toast = {
  success: (m: string) => external?.('success', m),
  error: (m: string) => external?.('error', m),
  info: (m: string) => external?.('info', m),
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<Toast[]>([]);
  const insets = useSafeAreaInsets();
  const show = React.useCallback((kind: Toast['kind'], message: string) => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs.slice(-2), { id, kind, message }]);
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(kind === 'error' ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), kind === 'error' ? 5000 : 3200);
  }, []);
  React.useEffect(() => {
    external = show;
    return () => {
      external = null;
    };
  }, [show]);
  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 10, left: 12, right: 12, alignItems: 'center', gap: 8 }}>
        {items.map((it) => (
          <ToastView key={it.id} toast={it} onDismiss={() => setItems((xs) => xs.filter((x) => x.id !== it.id))} />
        ))}
      </View>
    </ToastCtx.Provider>
  );
}

function ToastView({ toast: it, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [a] = React.useState(() => new Animated.Value(0));
  React.useEffect(() => {
    Animated.spring(a, { toValue: 1, useNativeDriver: Platform.OS !== 'web', friction: 7 }).start();
  }, [a]);
  const bg = it.kind === 'error' ? brand.red600 : it.kind === 'success' ? brand.plum700 : brand.ink;
  return (
    <Animated.View style={{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }], width: '100%', maxWidth: 480 }}>
      <Pressable onPress={onDismiss} accessibilityRole="alert" style={{ backgroundColor: bg, borderRadius: R.card, paddingVertical: 12, paddingHorizontal: 16, ...shadow.lift }}>
        <T color="#fff" w="medium" align="center">
          {it.message}
        </T>
      </Pressable>
    </Animated.View>
  );
}

export const useToast = () => React.useContext(ToastCtx);
