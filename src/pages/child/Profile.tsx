import { useTranslation } from 'react-i18next';
import { useChildIdentity } from '@/auth/AuthProvider';
import { ChildAvatar, PageHeader } from '@/components/brand/misc';
import { LanguageToggle, ThemeToggle } from '@/components/layout/Toggles';

export default function ChildProfile() {
  const { t } = useTranslation();
  const { child, family } = useChildIdentity();
  return (
    <>
      <PageHeader title={t('child.profileTitle')} />
      <div className="surface flex flex-col items-center gap-4 rounded-[var(--radius-hero)] p-8 text-center shadow-[var(--shadow-soft)]">
        <ChildAvatar avatar={child.avatar} color={child.color} size="xl" />
        <h2 className="font-display text-3xl">{child.display_name}</h2>
        <dl className="grid gap-2 text-lg">
          <div><dt className="inline text-muted">{t('child.familyCode')}: </dt><dd className="inline font-bold tracking-[0.2em]" dir="ltr">{family.family_code}</dd></div>
          <div><dt className="inline text-muted">{t('child.username')}: </dt><dd className="inline font-semibold" dir="ltr">{child.username}</dd></div>
        </dl>
        <p className="text-sm text-muted">{t('child.changeSecret')}</p>
        <div className="flex gap-1"><LanguageToggle /><ThemeToggle /></div>
      </div>
    </>
  );
}
