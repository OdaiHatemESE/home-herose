import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';

export default function Privacy() {
  const { t } = useTranslation();
  return (
    <article className="mx-auto max-w-2xl px-4 py-10">
      <ShieldCheck className="size-10 text-leaf-500" aria-hidden />
      <h1 className="mt-3 text-3xl font-bold">{t('privacyPage.title')}</h1>
      <div className="mt-6 grid gap-4 text-lg leading-relaxed">
        {(['p1', 'p2', 'p3', 'p4', 'p5', 'p6'] as const).map((k) => (
          <p key={k}>{t(`privacyPage.${k}`)}</p>
        ))}
      </div>
    </article>
  );
}
