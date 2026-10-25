import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useChildIdentity, useAuth } from '@/auth/AuthProvider';
import { useNotes, useSaveRow } from '@/api/content';
import { formatDate } from '@/lib/dates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { EmptyState, PageHeader } from '@/components/brand/misc';

export default function ChildFeedback() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { child, family } = useChildIdentity();
  const { session } = useAuth();
  const notes = useNotes({ childId: child.id });
  const save = useSaveRow('notes', t('notes.saved'));
  const [body, setBody] = React.useState('');

  return (
    <>
      <PageHeader title={t('child.feedbackTitle')} />
      <form
        className="surface mb-6 grid gap-3 rounded-[var(--radius-card)] p-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(
            { family_id: family.id, child_id: child.id, author_id: session?.user.id, author_role: 'child', kind: 'reflection', visibility: 'child_visible', body },
            { onSuccess: () => setBody('') },
          );
        }}
      >
        <label htmlFor="refl" className="font-medium">{t('notes.childReflection')}</label>
        <Textarea id="refl" value={body} maxLength={4000} onChange={(e) => setBody(e.target.value)} />
        <Button type="submit" className="justify-self-start" loading={save.isPending} disabled={!body.trim()}>{t('notes.childReflectionCta')}</Button>
      </form>
      {!notes.data?.length ? (
        <EmptyState icon="💌" title={t('child.feedbackEmpty')} />
      ) : (
        <ul className="grid gap-3">
          {notes.data.map((n) => (
            <li key={n.id} className={n.author_role === 'child' ? 'rounded-[var(--radius-card)] bg-surface-2 p-4' : 'surface rounded-[var(--radius-card)] border-s-4 border-s-rose-500 p-4 shadow-[var(--shadow-soft)]'}>
              <div className="flex items-center gap-2">
                <Badge tone={n.author_role === 'child' ? 'blue' : 'pink'}>{t(`notes.kinds.${n.kind}`)}</Badge>
                <span className="ms-auto text-xs text-muted">{formatDate(n.created_at.slice(0, 10), lang, { day: 'numeric', month: 'short' })}</span>
              </div>
              {n.title && <p className="mt-2 font-semibold">{n.title}</p>}
              <p className="mt-1 whitespace-pre-line text-lg">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
