import { useFonts } from 'expo-font';
import { ReadexPro_400Regular, ReadexPro_500Medium, ReadexPro_600SemiBold, ReadexPro_700Bold } from '@expo-google-fonts/readex-pro';
import { Lalezar_400Regular } from '@expo-google-fonts/lalezar';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { ActivityIndicator, I18nManager, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { CelebrateProvider, TrophyMark } from '@/components/brand';
import { ToastProvider } from '@/components/toast';
import { T } from '@/components/ui';
import { loadLanguage } from '@/i18n';
import { brand, loadThemeMode, ThemeProvider, useTheme } from '@/lib/theme';

// The layout is mirrored by hand for Arabic (row-reverse + right alignment); stop the OS from flipping it again.
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

void SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: Platform.OS === 'web' },
  },
});

function Splash() {
  return (
    <View style={{ flex: 1, backgroundColor: brand.plum500, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <TrophyMark size={96} />
      <T display size={34} color="#fff" align="center">
        أبطال البيت
      </T>
      <ActivityIndicator color={brand.gold300} />
    </View>
  );
}

/** GitHub Pages sends unknown deep links to 404.html, which forwards them here as ?redirect=… */
function useWebDeepLinkRestore() {
  const router = useRouter();
  React.useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const target = params.get('redirect');
    if (target && target.startsWith('/')) router.replace(target as never);
  }, [router]);
}

function Gate() {
  const { ready, session, identity, identityLoading } = useAuth();
  const { c } = useTheme();
  useWebDeepLinkRestore();
  if (!ready || (session && identityLoading)) return <Splash />;
  const kind = identity.kind;
  return (
    <>
      <StatusBar style={c.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'fade' }}>
        <Stack.Protected guard={kind === 'parent'}>
          <Stack.Screen name="parent" />
        </Stack.Protected>
        <Stack.Protected guard={kind === 'child'}>
          <Stack.Screen name="child" />
        </Stack.Protected>
        <Stack.Protected guard={kind === 'parent-no-family'}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={kind === 'none'}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="child-login" />
          <Stack.Screen name="forgot-password" />
        </Stack.Protected>
        {/* reachable whatever the sign-in state */}
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="invite/[token]" />
        <Stack.Screen name="privacy" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Readex400: ReadexPro_400Regular,
    Readex500: ReadexPro_500Medium,
    Readex600: ReadexPro_600SemiBold,
    Readex700: ReadexPro_700Bold,
    Lalezar: Lalezar_400Regular,
  });
  const [prefs, setPrefs] = React.useState<null | { theme: 'light' | 'dark' | 'system' }>(null);
  React.useEffect(() => {
    void Promise.all([loadLanguage(), loadThemeMode()]).then(([, theme]) => setPrefs({ theme }));
  }, []);
  const ready = fontsLoaded && prefs;
  React.useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  if (!ready) return <View style={{ flex: 1, backgroundColor: brand.plum500 }} />;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider initialMode={prefs.theme}>
          <ToastProvider>
            <CelebrateProvider>
              <AuthProvider>
                <Gate />
              </AuthProvider>
            </CelebrateProvider>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
