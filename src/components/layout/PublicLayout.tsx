import { Link, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/brand/Logo';
import { LanguageToggle, ThemeToggle } from './Toggles';

export function PublicLayout() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" aria-label={t('app.name')}>
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <footer className="mx-auto w-full max-w-6xl px-4 py-8 text-sm text-muted sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>{t('app.tagline')}</span>
          <Link to="/privacy" className="underline-offset-4 hover:underline">
            {t('landing.privacy')}
          </Link>
        </div>
      </footer>
    </div>
  );
}

/** Narrow centred card used by sign-in style pages. */
export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-8 sm:py-14">
      <div className="surface rounded-[var(--radius-hero)] p-6 shadow-[var(--shadow-lift)] sm:p-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1.5 text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
