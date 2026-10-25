import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { useAuth, useParent } from '@/auth/AuthProvider';
import { childAccountApi, privacyApi, useUpdateFamily, useUpdateSettings } from '@/api/family';
import { useAction } from '@/api/core';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';
import { downloadFile } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/label';
import { Input, Select } from '@/components/ui/input';
import { useConfirm } from '@/components/ui/confirm';
import { PageHeader } from '@/components/brand/misc';
import { LanguageToggle, ThemeToggle } from '@/components/layout/Toggles';

const CURRENCIES = ['AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'EGP', 'JOD', 'GBP', 'USD', 'EUR'];

export default function Settings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { familyId, family, settings, membership, profile } = useParent();
  const { signOut, refreshIdentity } = useAuth();
  const confirm = useConfirm();
  const updateFamily = useUpdateFamily();
  const updateSettings = useUpdateSettings();
  const [name, setName] = React.useState(family.name);
  const [currency, setCurrency] = React.useState(family.currency);
  const [timezone, setTimezone] = React.useState(family.timezone);
  const [displayName, setDisplayName] = React.useState(profile?.display_name ?? '');
  const isOwner = membership.role === 'owner';

  const regenerate = useAction(() => privacyApi.regenerateCode(familyId), { success: t('settings.codeRegenerated'), invalidate: [['identity']] });
  const retention = useAction(() => privacyApi.applyRetention(familyId), { success: t('settings.retentionApplied') });
  const exportData = useMutation({
    mutationFn: () => privacyApi.exportData(familyId),
    onSuccess: (data) => {
      downloadFile(`home-heroes-export-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json');
      toast.success(t('settings.exported'));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const saveProfile = useAction(async (v: string) => {
    const { error } = await supabase.from('profiles').update({ display_name: v }).eq('id', membership.user_id);
    if (error) throw error;
  }, { success: t('common.saved'), invalidate: [['identity'], ['members']] });
  const danger = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      <PageHeader title={t('settings.title')} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t('settings.family')}</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); updateFamily.mutate({ id: familyId, name, currency, timezone }); }}>
              <Field label={t('settings.familyName')} htmlFor="st-name"><Input id="st-name" value={name} disabled={!isOwner} onChange={(e) => setName(e.target.value)} /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label={t('onboarding.currency')} htmlFor="st-cur">
                  <Select id="st-cur" dir="ltr" value={currency} disabled={!isOwner} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select>
                </Field>
                <Field label={t('onboarding.timezone')} htmlFor="st-tz"><Input id="st-tz" dir="ltr" value={timezone} disabled={!isOwner} onChange={(e) => setTimezone(e.target.value)} /></Field>
              </div>
              <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-control)] bg-gold-50 px-3 py-2 dark:bg-gold-400/10">
                <span className="text-sm">{t('dashboard.familyCode')}</span>
                <span dir="ltr" className="text-lg font-bold tracking-[0.25em]">{family.family_code}</span>
                {isOwner && (
                  <Button type="button" size="sm" variant="ghost" className="ms-auto" loading={regenerate.isPending}
                    onClick={async () => { if (await confirm({ title: t('settings.regenerateCode'), description: t('settings.regenerateConfirm') })) regenerate.mutate(undefined); }}>
                    <RefreshCw /> {t('settings.regenerateCode')}
                  </Button>
                )}
              </div>
              {isOwner && <Button type="submit" className="justify-self-start" loading={updateFamily.isPending}>{t('common.save')}</Button>}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('settings.profile')}</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); saveProfile.mutate(displayName); }}>
              <Field label={t('settings.displayName')} htmlFor="st-dn" className="flex-1"><Input id="st-dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></Field>
              <Button type="submit" loading={saveProfile.isPending}>{t('common.save')}</Button>
            </form>
            <div>
              <p className="mb-1 text-sm font-medium">{t('settings.appearance')}</p>
              <div className="flex gap-1"><LanguageToggle /><ThemeToggle /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-leaf-500" /> {t('settings.privacy')}</CardTitle>
              <CardDescription>{t('settings.privacyBody')}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div className="grid content-start gap-2">
              <Button variant="outline" className="justify-self-start" loading={exportData.isPending} onClick={() => exportData.mutate()}>
                <Download /> {t('settings.export')}
              </Button>
            </div>
            <div className="grid gap-2">
              <Field label={t('settings.retention')} htmlFor="st-ret" hint={t('settings.retentionHint')}>
                <Select id="st-ret" value={settings.retention_months ?? ''} disabled={!isOwner}
                  onChange={(e) => updateSettings.mutate({ family_id: familyId, retention_months: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">{t('settings.retentionForever')}</option>
                  {[6, 12, 24, 36].map((m) => <option key={m} value={m}>{t('settings.retentionMonths', { count: m })}</option>)}
                </Select>
              </Field>
              {isOwner && settings.retention_months && (
                <Button size="sm" variant="ghost" className="justify-self-start" loading={retention.isPending} onClick={() => retention.mutate(undefined)}>{t('settings.applyRetention')}</Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-300 lg:col-span-2 dark:border-red-500/40">
          <CardHeader><CardTitle className="text-red-600">{t('settings.danger')}</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {isOwner && (
              <Button variant="danger" loading={danger.isPending} onClick={async () => {
                const ok = await confirm({ title: t('settings.deleteFamily'), description: t('settings.deleteFamilyBody'), tone: 'danger', typeToConfirm: family.name, confirmLabel: t('common.delete') });
                if (ok) danger.mutate(async () => {
                  await childAccountApi.deleteFamily(familyId, family.name);
                  toast.success(t('settings.familyDeleted'));
                  await refreshIdentity();
                  navigate('/onboarding', { replace: true });
                });
              }}>
                <Trash2 /> {t('settings.deleteFamily')}
              </Button>
            )}
            {!isOwner && (
              <Button variant="outline" className="text-red-600" loading={danger.isPending} onClick={async () => {
                const ok = await confirm({ title: t('settings.deleteAccount'), tone: 'danger', confirmLabel: t('common.delete') });
                if (ok) danger.mutate(async () => { await childAccountApi.deleteMyAccount(); await signOut(); navigate('/', { replace: true }); });
              }}>
                <Trash2 /> {t('settings.deleteAccount')}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
