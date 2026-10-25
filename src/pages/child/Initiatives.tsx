import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import { useChildIdentity } from '@/auth/AuthProvider';
import { initiativeApi, useInitiatives } from '@/api/initiatives';
import { useAction } from '@/api/core';
import { formatDate, formatNumber } from '@/lib/dates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/label';
import { Input, Textarea } from '@/components/ui/input';
import { PageHeader } from '@/components/brand/misc';
import { celebrate } from '@/components/brand/celebrate';

export default function ChildInitiatives() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { child, settings } = useChildIdentity();
  const history = useInitiatives({ childId: child.id, limit: 50 });
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const submit = useAction(initiativeApi.submit, { success: () => { celebrate('small'); return t('initiatives.sent'); } });

  return (
    <>
      <PageHeader title={t('initiatives.childTitle')} description={t('initiatives.childIntro')} />
      <form
        className="surface grid gap-4 rounded-[var(--radius-hero)] border-gold-400/60 p-5 shadow-[var(--shadow-soft)]"
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim().length < 2) return toast.error(t('validation.required'));
          submit.mutate({ title, description }, { onSuccess: () => { setTitle(''); setDescription(''); } });
        }}
      >
        <Sparkles className="size-10 text-gold-400" aria-hidden />
        <Field label={t('initiatives.whatDid')} htmlFor="ci-title">
          <Input id="ci-title" className="h-13 text-lg" value={title} maxLength={120} placeholder={t('initiatives.whatDidPlaceholder')} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label={t('initiatives.moreDetails')} htmlFor="ci-desc">
          <Textarea id="ci-desc" value={description} maxLength={1000} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <p className="text-sm text-muted">{t('initiatives.examples')}</p>
        <p className="text-sm text-muted">{t('initiatives.capInfo', { cap: settings.initiative_daily_cap })}</p>
        <Button type="submit" size="xl" variant="gold" loading={submit.isPending}>{t('initiatives.childCta')} ✦</Button>
      </form>

      <h2 className="mt-8 mb-3 text-lg font-semibold">{t('initiatives.history')}</h2>
      <ul className="grid gap-2">
        {(history.data ?? []).map((i) => (
          <li key={i.id} className="surface flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{i.title}</span>
              <span className="block text-sm text-muted">{formatDate(i.for_date, lang, { weekday: 'long', day: 'numeric', month: 'short' })}</span>
              {i.review_note && <span className="block text-sm">💬 {i.review_note}</span>}
            </span>
            {i.status === 'approved' ? (
              <Badge tone="gold">✦ +{formatNumber(i.points_awarded ?? 0, lang)}</Badge>
            ) : i.status === 'pending' ? (
              <Badge tone="purple">{t('child.waiting')}</Badge>
            ) : (
              <Badge>{t('initiatives.rejected')}</Badge>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
