import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { Direction } from 'radix-ui';
import { useTranslation } from 'react-i18next';
import { ThemeProvider, useTheme } from '@/lib/theme';
import { AuthProvider } from '@/auth/AuthProvider';
import { ConfirmProvider } from '@/components/ui/confirm';
import { AppRouter } from './router';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { DemoBanner } from '@/components/layout/DemoBanner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 10_000, retry: 1, refetchOnWindowFocus: true },
    mutations: { retry: 0 },
  },
});

function Shell() {
  const { i18n } = useTranslation();
  const { theme } = useTheme();
  const dir = i18n.dir(i18n.language);
  return (
    <Direction.Provider dir={dir}>
      <DemoBanner />
      <ConfirmProvider>
        <AuthProvider>
          <ErrorBoundary>
            <AppRouter />
          </ErrorBoundary>
        </AuthProvider>
      </ConfirmProvider>
      <Toaster position="top-center" dir={dir} theme={theme} richColors closeButton toastOptions={{ style: { fontFamily: 'var(--font-sans)' } }} />
    </Direction.Provider>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Shell />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
