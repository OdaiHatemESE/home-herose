import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Ban, Check, Gift, HandCoins, PackageCheck, Pencil, Plus, Trash2 } from 'lucide-react';
import { useParent } from '@/auth/AuthProvider';
import { useChildren } from '@/api/family';
import { useDeleteRow, useFamilyTable, useSaveRow } from '@/api/content';
import { rewardApi, useFulfillments } from '@/api/rewards';
import { useAction } from '@/api/core';
import { pick } from '@/i18n';
import { formatDate, formatMoney } from '@/lib/dates';
import type { LimitPeriod, RewardCatalogItem, RewardCategory } from '@/lib/database.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Field } from '@/components/ui/label';
import { Input, Select, Textarea } from '@/components/ui/input';
import { SwitchRow, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/controls';
import { useConfirm } from '@/components/ui/confirm';
import { EmptyState, PageHeader } from '@/components/brand/misc';
import { ChildChips, ChildName, ChildSelect, useChildMap } from '@/components/parent/shared';

export default function Rewards() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { familyId, family } = useParent();
  const catalog = useFamilyTable('reward_catalog', familyId);
  const levels = useFamilyTable('achievement_levels', familyId, 'rank');
  const children = useChildren(familyId, { includeInactive: true });
  const childMap = useChildMap(children.data);
  const ledger = useFulfillments({ familyId });
  const save = useSaveRow('reward_catalog', t('common.saved'));
  const del = useDeleteRow('reward_catalog', t('common.deleted'));
  const update = useAction(rewardApi.update, { success: t('rewards.updated') });
  const confirm = useConfirm();
  const [edit, setEdit] = React.useState<Partial<RewardCatalogItem> | null>(null);
  const [grantOpen, setGrantOpen] = React.useState(false);
  const [childFilter, setChildFilter] = React.useState('');

  const rows = (ledger.data ?? []).filter((f) => !childFilter || f.child_id === childFilter);
  const unpaid = rows.filter((f) => f.payment_status === 'unpaid' && f.status !== 'cancelled').reduce((s, f) => s + Number(f.amount ?? 0), 0);
  const levelName = (id: string | null) => {
    const l = levels.data?.find((x) => x.id === id);
    return l ? `${l.icon} ${pick(lang, l.name_ar, l.name_en)}` : t('rewards.anyLevel');
  };

  return (
    <>
      <PageHeader
        title={t('rewards.title')}
        description={t('rewards.description')}
        actions={
          <>
            <Button variant="gold" onClick={() => setGrantOpen(true)}><Gift /> {t('rewards.grant')}</Button>
            <Button variant="outline" onClick={() => setEdit({ family_id: familyId, name_ar: '', name_en: '', icon: '🎁', category: 'privilege', is_available: true, limit_period: 'none' })}>
              <Plus /> {t('rewards.add')}
            </Button>
          </>
        }
      />
      <p className="mb-5 rounded-[var(--radius-card)] border-s-4 border-rose-500 bg-rose-100/50 px-4 py-3 text-sm dark:bg-rose-500/10">{t('rewards.principle')}</p>
      <Tabs defaultValue="ledger">
        <TabsList>
          <TabsTrigger value="ledger">{t('rewards.ledger')}</TabsTrigger>
          <TabsTrigger value="catalog">{t('rewards.catalog')}</TabsTrigger>
        </TabsList>
        <TabsContent value="ledger">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            {children.data && <ChildChips kids={children.data} value={childFilter} onChange={setChildFilter} />}
            <span className="inline-flex items-center gap-2 rounded-full bg-gold-100 px-4 py-1.5 text-sm font-medium text-gold-800 dark:bg-gold-400/15 dark:text-gold-300">
              <HandCoins className="size-4" /> {t('rewards.unpaidTotal')}: {formatMoney(unpaid, family.currency, lang)}
            </span>
          </div>
          {rows.length === 0 ? (
            <EmptyState icon="🎁" title={t('rewards.ledgerEmpty')} />
          ) : (
            <ul className="grid gap-2">
              {rows.map((f) => (
                <li key={f.id} className="surface flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] px-4 py-3">
                  <ChildName child={childMap.get(f.child_id)} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{f.title}</span>
                    <span className="block text-xs text-muted">{formatDate(f.created_at.slice(0, 10), lang, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </span>
                  {f.amount ? <span className="font-semibold">{formatMoney(Number(f.amount), f.currency ?? family.currency, lang)}</span> : null}
                  <Badge tone={f.status === 'fulfilled' ? 'green' : f.status === 'cancelled' ? 'neutral' : f.status === 'pending' ? 'gold' : 'purple'}>{t(`status.${f.status}`)}</Badge>
                  {f.payment_status !== 'not_applicable' && <Badge tone={f.payment_status === 'paid' ? 'green' : 'pink'}>{t(`status.${f.payment_status}`)}</Badge>}
                  <span className="flex gap-1">
                    {f.status === 'pending' && (
                      <Button size="sm" variant="soft" onClick={() => update.mutate({ id: f.id, status: 'approved' })}><Check /> {t('rewards.approve')}</Button>
                    )}
                    {f.status === 'approved' && (
                      <Button size="sm" variant="soft" onClick={() => update.mutate({ id: f.id, status: 'fulfilled' })}><PackageCheck /> {t('rewards.markFulfilled')}</Button>
                    )}
                    {f.payment_status === 'unpaid' && f.status !== 'cancelled' && (
                      <Button size="sm" variant="success" onClick={() => update.mutate({ id: f.id, payment: 'paid' })}><HandCoins /> {t('rewards.markPaid')}</Button>
                    )}
                    {(f.status === 'pending' || f.status === 'approved') && (
                      <Button size="icon" variant="ghost" aria-label={t('rewards.cancel')} onClick={async () => {
                        if (await confirm({ title: t('rewards.cancel'), tone: 'danger' })) update.mutate({ id: f.id, status: 'cancelled' });
                      }}><Ban /></Button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="catalog">
          <ul className="grid gap-3 sm:grid-cols-2">
            {(catalog.data ?? []).map((r) => (
              <li key={r.id} className="surface flex items-start gap-3 rounded-[var(--radius-card)] p-4">
                <span className="text-3xl" aria-hidden>{r.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{pick(lang, r.name_ar, r.name_en)}</p>
                  <p className="text-sm text-muted">{levelName(r.min_level_id)}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <Badge tone="purple">{t(`rewards.categories.${r.category}`)}</Badge>
                    {r.value_amount ? <Badge tone="gold">{formatMoney(Number(r.value_amount), family.currency, lang)}</Badge> : null}
                    {r.limit_period !== 'none' && <Badge>{r.limit_count}× {t(`rewards.periods.${r.limit_period}`)}</Badge>}
                    {!r.is_available && <Badge>{t('common.inactive')}</Badge>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" aria-label={t('common.edit')} onClick={() => setEdit(r)}><Pencil /></Button>
                <Button variant="ghost" size="icon" aria-label={t('common.delete')} onClick={async () => { if (await confirm({ title: t('common.delete'), tone: 'danger' })) del.mutate(r.id); }}><Trash2 /></Button>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        {edit && (
          <DialogContent wide title={edit.id ? t('rewards.edit') : t('rewards.add')}>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.mutate(edit, { onSuccess: () => setEdit(null) }); }}>
              <Field label={t('rewards.nameAr')} htmlFor="rw-ar"><Input id="rw-ar" required value={edit.name_ar ?? ''} onChange={(e) => setEdit({ ...edit, name_ar: e.target.value })} /></Field>
              <Field label={t('rewards.nameEn')} htmlFor="rw-en"><Input id="rw-en" dir="ltr" value={edit.name_en ?? ''} onChange={(e) => setEdit({ ...edit, name_en: e.target.value })} /></Field>
              <Field label={t('common.description')} htmlFor="rw-desc" className="sm:col-span-2"><Textarea id="rw-desc" className="min-h-16" value={edit.description ?? ''} onChange={(e) => setEdit({ ...edit, description: e.target.value || null })} /></Field>
              <Field label={t('common.icon')} htmlFor="rw-icon"><Input id="rw-icon" maxLength={4} value={edit.icon ?? ''} onChange={(e) => setEdit({ ...edit, icon: e.target.value })} /></Field>
              <Field label={t('rewards.category')} htmlFor="rw-cat">
                <Select id="rw-cat" value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value as RewardCategory })}>
                  {(['privilege', 'activity', 'money', 'certificate', 'other'] as const).map((c) => <option key={c} value={c}>{t(`rewards.categories.${c}`)}</option>)}
                </Select>
              </Field>
              <Field label={`${t('rewards.value')} (${family.currency})`} htmlFor="rw-val" hint={t('common.optional')}><Input id="rw-val" type="number" min={0} step="0.5" value={edit.value_amount ?? ''} onChange={(e) => setEdit({ ...edit, value_amount: e.target.value === '' ? null : Number(e.target.value) })} /></Field>
              <Field label={t('rewards.minLevel')} htmlFor="rw-lvl">
                <Select id="rw-lvl" value={edit.min_level_id ?? ''} onChange={(e) => setEdit({ ...edit, min_level_id: e.target.value || null })}>
                  <option value="">{t('rewards.anyLevel')}</option>
                  {(levels.data ?? []).map((l) => <option key={l.id} value={l.id}>{l.icon} {pick(lang, l.name_ar, l.name_en)}</option>)}
                </Select>
              </Field>
              <Field label={t('tasks.minAge')} htmlFor="rw-min"><Input id="rw-min" type="number" min={0} value={edit.min_age ?? ''} onChange={(e) => setEdit({ ...edit, min_age: e.target.value === '' ? null : Number(e.target.value) })} /></Field>
              <Field label={t('tasks.maxAge')} htmlFor="rw-max"><Input id="rw-max" type="number" min={0} value={edit.max_age ?? ''} onChange={(e) => setEdit({ ...edit, max_age: e.target.value === '' ? null : Number(e.target.value) })} /></Field>
              <Field label={t('rewards.limitPeriod')} htmlFor="rw-per">
                <Select id="rw-per" value={edit.limit_period} onChange={(e) => setEdit({ ...edit, limit_period: e.target.value as LimitPeriod, limit_count: e.target.value === 'none' ? null : edit.limit_count ?? 1 })}>
                  {(['none', 'weekly', 'monthly'] as const).map((p) => <option key={p} value={p}>{t(`rewards.periods.${p}`)}</option>)}
                </Select>
              </Field>
              {edit.limit_period !== 'none' && (
                <Field label={t('rewards.limitCount')} htmlFor="rw-cnt"><Input id="rw-cnt" type="number" min={1} value={edit.limit_count ?? 1} onChange={(e) => setEdit({ ...edit, limit_count: Number(e.target.value) })} /></Field>
              )}
              <div className="sm:col-span-2"><SwitchRow id="rw-av" label={t('rewards.available')} checked={edit.is_available ?? true} onCheckedChange={(v) => setEdit({ ...edit, is_available: v })} /></div>
              <DialogFooter className="sm:col-span-2">
                <Button type="button" variant="outline" onClick={() => setEdit(null)}>{t('common.cancel')}</Button>
                <Button type="submit" loading={save.isPending}>{t('common.save')}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>
      <GrantDialog open={grantOpen} onOpenChange={setGrantOpen} />
    </>
  );
}

function GrantDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t, i18n } = useTranslation();
  const { familyId, family } = useParent();
  const children = useChildren(familyId);
  const catalog = useFamilyTable('reward_catalog', familyId);
  const [childId, setChildId] = React.useState('');
  const [rewardId, setRewardId] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [note, setNote] = React.useState('');
  const grant = useAction(rewardApi.grant, { success: t('rewards.granted') });
  React.useEffect(() => {
    if (open) {
      setChildId(children.data?.[0]?.id ?? '');
      setRewardId('');
      setTitle('');
      setAmount('');
      setNote('');
    }
  }, [open, children.data]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t('rewards.grantTitle')}>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            grant.mutate(
              { childId, rewardId: rewardId || null, title: rewardId ? null : title, amount: amount === '' ? null : Number(amount), note },
              { onSuccess: () => onOpenChange(false) },
            );
          }}
        >
          <Field label={t('common.child')} htmlFor="gr-child"><ChildSelect id="gr-child" kids={children.data ?? []} value={childId} onChange={setChildId} /></Field>
          <Field label={t('rewards.catalog')} htmlFor="gr-rew">
            <Select id="gr-rew" value={rewardId} onChange={(e) => setRewardId(e.target.value)}>
              <option value="">{t('rewards.customTitle')}</option>
              {(catalog.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.icon} {pick(i18n.language, r.name_ar, r.name_en)}</option>)}
            </Select>
          </Field>
          {!rewardId && <Field label={t('common.name')} htmlFor="gr-title"><Input id="gr-title" value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>}
          <Field label={`${t('rewards.value')} (${family.currency})`} htmlFor="gr-amt" hint={t('common.optional')}><Input id="gr-amt" type="number" min={0} step="0.5" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label={t('common.note')} htmlFor="gr-note"><Input id="gr-note" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button type="submit" loading={grant.isPending} disabled={!childId || (!rewardId && title.trim().length < 2)}>{t('rewards.grant')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
