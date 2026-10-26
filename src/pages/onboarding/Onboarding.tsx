import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Check, CircleAlert, Copy, Plus, RefreshCw, Trash2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/auth/AuthProvider';
import { familyApi } from '@/api/family';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';
import { AVATAR_KEYS, avatarEmoji, COLOR_KEYS } from '@/lib/icons';
import { secretProblem, suggestSecret, suggestUsername } from '@/lib/secrets';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/label';
import { Input, Select } from '@/components/ui/input';
import { Checkbox, Switch } from '@/components/ui/controls';
import { ErrorState } from '@/components/brand/misc';
import { TrophyMark } from '@/components/brand/Logo';
import { pendingInviteToken } from '@/pages/public/AcceptInvite';

type DraftChild = {
  key: string;
  name: string;
  age: string;
  username: string;
  secret: string;
  responsibility: string;
  avatar: string;
  color: string;
  simple: boolean;
};

const TIMEZONES = ['Asia/Dubai', 'Asia/Riyadh', 'Asia/Qatar', 'Asia/Kuwait', 'Asia/Bahrain', 'Asia/Muscat', 'Africa/Cairo', 'Asia/Amman', 'Europe/London', 'America/New_York'];
const CURRENCIES = ['AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'EGP', 'JOD', 'GBP', 'USD', 'EUR'];

function newChild(lang: string, partial: Partial<DraftChild> = {}): DraftChild {
  return {
    key: crypto.randomUUID(),
    name: '',
    age: '',
    username: '',
    secret: suggestSecret(lang),
    responsibility: '',
    avatar: AVATAR_KEYS[Math.floor(Math.random() * AVATAR_KEYS.length)],
    color: 'purple',
    simple: false,
    ...partial,
  };
}

export default function Onboarding() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { session, refreshIdentity } = useAuth();
  const lang = i18n.language;

  React.useEffect(() => {
    const invite = pendingInviteToken();
    if (invite) navigate(`/invite/${invite}`, { replace: true });
  }, [navigate]);

  const [step, setStep] = React.useState(0);
  const [family, setFamily] = React.useState({
    name: '',
    parentName: (session?.user.user_metadata?.display_name as string) ?? '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone && TIMEZONES.includes(Intl.DateTimeFormat().resolvedOptions().timeZone)
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'Asia/Dubai',
    currency: 'AED',
  });
  const [kids, setKids] = React.useState<DraftChild[]>([newChild(lang)]);
  const [starterTasks, setStarterTasks] = React.useState(true);
  const [initiative, setInitiative] = React.useState({ points: 1, cap: 2 });
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [errors, setErrors] = React.useState<string[]>([]);
  const [running, setRunning] = React.useState<null | { label: string; done: string[] }>(null);
  const [inviteLink, setInviteLink] = React.useState<string | null>(null);
  const [finished, setFinished] = React.useState(false);

  const steps = [t('onboarding.familyStep'), t('onboarding.childrenStep'), t('onboarding.tasksStep'), t('onboarding.scoringStep'), t('onboarding.inviteStep')];

  const useTemplate = () => {
    const tpl: Partial<DraftChild>[] = [
      { name: 'تُقى', age: '12', username: 'tuqa', responsibility: 'ترتيب غرفة الجلوس والمساحة المشتركة المتفق عليها', avatar: 'butterfly', color: 'pink' },
      { name: 'ريتال', age: '11', username: 'retal', responsibility: 'تنظيم المطبخ بما يناسب عمرها والمساعدة في غسالة الصحون', avatar: 'flower', color: 'purple' },
      { name: 'حاتم', age: '10', username: 'hatem', responsibility: 'العناية بنفايات المنزل', avatar: 'falcon', color: 'blue' },
      { name: 'أُبي', age: '5', username: 'obai', responsibility: 'ترتيب ألعابه وأغراضه', avatar: 'lion', color: 'gold', simple: true },
    ];
    setKids(tpl.map((p) => newChild(lang, p)));
  };

  const updateKid = (key: string, patch: Partial<DraftChild>) => setKids((ks) => ks.map((k) => (k.key === key ? { ...k, ...patch } : k)));

  const validateStep = (): string[] => {
    const errs: string[] = [];
    if (step === 0 && family.name.trim().length < 2) errs.push(t('onboarding.familyName') + ': ' + t('validation.required'));
    if (step === 1) {
      if (kids.length === 0) errs.push(t('errors.no_children'));
      const usernames = new Set<string>();
      kids.forEach((k) => {
        const label = k.name || t('onboarding.childName');
        if (!k.name.trim()) errs.push(`${label}: ${t('validation.required')}`);
        if (!/^[a-z0-9_.-]{3,24}$/.test(k.username)) errs.push(`${label}: ${t('errors.invalid_username')}`);
        if (usernames.has(k.username)) errs.push(`${label}: ${t('errors.username_taken')}`);
        usernames.add(k.username);
        const sp = secretProblem(k.secret);
        if (sp) errs.push(`${label}: ${t(`errors.${sp}`)}`);
        const age = Number(k.age);
        if (k.age && (!Number.isInteger(age) || age < 2 || age > 18)) errs.push(`${label}: ${t('validation.max')}`);
      });
    }
    if (step === 4 && inviteEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(inviteEmail)) errs.push(t('validation.email'));
    return errs;
  };

  const next = () => {
    const errs = validateStep();
    setErrors(errs);
    if (errs.length === 0) setStep((s) => s + 1);
  };

  const finish = async () => {
    const errs = validateStep();
    setErrors(errs);
    if (errs.length) return;
    const done: string[] = [];
    const failures: string[] = [];
    try {
      setRunning({ label: t('onboarding.progressFamily'), done });
      const familyId = await familyApi.createFamily({ ...family, locale: lang });
      done.push(t('onboarding.progressFamily'));

      setRunning({ label: t('onboarding.progressChildren'), done: [...done] });
      const year = new Date().getFullYear();
      const created: string[] = [];
      for (const k of kids) {
        try {
          const res = await familyApi.createChild({
            familyId,
            displayName: k.name.trim(),
            username: k.username,
            birthYear: k.age ? year - Number(k.age) : null,
            avatar: k.avatar,
            color: k.color,
            uiMode: k.simple ? 'simple' : 'standard',
            householdResponsibility: k.responsibility.trim() || null,
            secret: k.secret,
          });
          created.push(res.childId);
        } catch (e) {
          failures.push(t('onboarding.childCreateFailed', { name: k.name, error: errorMessage(e) }));
        }
      }
      done.push(t('onboarding.progressChildren'));

      if (starterTasks && created.length) {
        setRunning({ label: t('onboarding.progressTasks'), done: [...done] });
        await familyApi.createStarterTasks({ familyId, childIds: created });
        done.push(t('onboarding.progressTasks'));
      }
      if (initiative.points !== 1 || initiative.cap !== 2) {
        await supabase.from('family_settings').update({ initiative_points: initiative.points, initiative_daily_cap: initiative.cap }).eq('family_id', familyId);
      }
      if (inviteEmail.trim()) {
        setRunning({ label: t('onboarding.progressInvite'), done: [...done] });
        const inv = await familyApi.createInvitation({ familyId, email: inviteEmail.trim() });
        setInviteLink(`${window.location.origin}${window.location.pathname}#/invite/${inv.token}`);
        done.push(t('onboarding.progressInvite'));
      }
      setErrors(failures);
      setRunning(null);
      setFinished(true);
    } catch (e) {
      setRunning(null);
      setErrors([...failures, errorMessage(e)]);
    }
  };

  const goToDashboard = async () => {
    await refreshIdentity();
    await qc.invalidateQueries();
    toast.success(t('onboarding.done'));
    navigate('/parent', { replace: true });
  };

  if (finished) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 text-center">
        <TrophyMark className="mx-auto size-20" />
        <h1 className="mt-4 font-display text-4xl text-plum-600 dark:text-plum-200">{t('onboarding.done')}</h1>
        {errors.length > 0 && (
          <div className="mt-6 text-start">
            <ErrorState message={errors.join(' — ')} />
          </div>
        )}
        {inviteLink && <InviteLinkBox link={inviteLink} />}
        <Button size="xl" variant="gold" className="mt-8" onClick={goToDashboard}>
          {t('onboarding.finish')}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <h1 className="font-display text-4xl text-plum-600 sm:text-5xl dark:text-plum-200">{t('onboarding.title')}</h1>
      <ol className="mt-6 flex flex-wrap gap-2" aria-label={t('onboarding.step', { current: step + 1, total: steps.length })}>
        {steps.map((s, i) => (
          <li
            key={s}
            aria-current={i === step ? 'step' : undefined}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm',
              i === step ? 'bg-plum-500 text-white' : i < step ? 'bg-leaf-100 text-leaf-500 dark:bg-leaf-500/20' : 'bg-surface-2 text-muted',
            )}
          >
            {i < step ? <Check className="size-4" aria-hidden /> : <span className="tabular-nums">{i + 1}</span>}
            {s}
          </li>
        ))}
      </ol>

      <div className="surface mt-6 rounded-[var(--radius-hero)] p-5 shadow-[var(--shadow-soft)] sm:p-7">
        {errors.length > 0 && !running && (
          <div className="mb-5">
            <ErrorState message={errors.join(' — ')} />
          </div>
        )}

        {running ? (
          <div className="grid gap-3 py-6" role="status" aria-live="polite">
            <p className="font-semibold">{t('onboarding.creating')}</p>
            {running.done.map((d) => (
              <p key={d} className="flex items-center gap-2 text-leaf-500">
                <Check className="size-5" /> {d}
              </p>
            ))}
            <p className="flex items-center gap-2 text-muted">
              <RefreshCw className="size-5 animate-spin" /> {running.label}
            </p>
          </div>
        ) : step === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('onboarding.familyName')} htmlFor="fname" className="sm:col-span-2">
              <Input id="fname" value={family.name} placeholder={t('onboarding.familyNamePlaceholder')} onChange={(e) => setFamily({ ...family, name: e.target.value })} />
            </Field>
            <Field label={t('onboarding.parentName')} htmlFor="pname" className="sm:col-span-2">
              <Input id="pname" value={family.parentName} placeholder={t('onboarding.parentNamePlaceholder')} onChange={(e) => setFamily({ ...family, parentName: e.target.value })} />
            </Field>
            <Field label={t('onboarding.timezone')} htmlFor="tz">
              <Select id="tz" dir="ltr" value={family.timezone} onChange={(e) => setFamily({ ...family, timezone: e.target.value })}>
                {TIMEZONES.map((z) => (
                  <option key={z}>{z}</option>
                ))}
              </Select>
            </Field>
            <Field label={t('onboarding.currency')} htmlFor="cur">
              <Select id="cur" dir="ltr" value={family.currency} onChange={(e) => setFamily({ ...family, currency: e.target.value })}>
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
          </div>
        ) : step === 1 ? (
          <div className="grid gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="max-w-prose text-muted">{t('onboarding.childrenHint')}</p>
              <Button variant="soft" onClick={useTemplate}>
                <Wand2 /> {t('onboarding.useTemplate')}
              </Button>
            </div>
            <p className="-mt-3 text-sm text-muted">{t('onboarding.templateHint')}</p>
            {kids.map((k, idx) => (
              <fieldset key={k.key} className="rounded-[var(--radius-card)] border border-app p-4">
                <legend className="px-2 text-sm font-medium">
                  <span aria-hidden>{avatarEmoji(k.avatar)} </span>
                  {k.name || `${t('onboarding.childName')} ${idx + 1}`}
                </legend>
                <div className="grid gap-3 sm:grid-cols-6">
                  <Field label={t('onboarding.childName')} htmlFor={`n-${k.key}`} className="sm:col-span-3">
                    <Input
                      id={`n-${k.key}`}
                      value={k.name}
                      onChange={(e) => updateKid(k.key, { name: e.target.value })}
                      onBlur={() => !k.username && k.name && updateKid(k.key, { username: suggestUsername(k.name, kids.map((x) => x.username)) })}
                    />
                  </Field>
                  <Field label={t('onboarding.childAge')} htmlFor={`a-${k.key}`} className="sm:col-span-1">
                    <Input id={`a-${k.key}`} inputMode="numeric" value={k.age} onChange={(e) => updateKid(k.key, { age: e.target.value.replace(/\D/g, '') })} />
                  </Field>
                  <Field label={t('onboarding.childUsername')} htmlFor={`u-${k.key}`} className="sm:col-span-2">
                    <Input id={`u-${k.key}`} dir="ltr" value={k.username} onChange={(e) => updateKid(k.key, { username: e.target.value.toLowerCase().trim() })} />
                  </Field>
                  <Field label={t('onboarding.childSecret')} htmlFor={`s-${k.key}`} hint={t('onboarding.childSecretHint')} className="sm:col-span-3">
                    <div className="flex gap-2">
                      <Input id={`s-${k.key}`} value={k.secret} onChange={(e) => updateKid(k.key, { secret: e.target.value })} />
                      <Button type="button" variant="outline" size="icon" onClick={() => updateKid(k.key, { secret: suggestSecret(lang) })} aria-label={t('family.resetSecret')}>
                        <RefreshCw />
                      </Button>
                    </div>
                  </Field>
                  <Field label={t('onboarding.responsibility')} htmlFor={`r-${k.key}`} className="sm:col-span-3">
                    <Input id={`r-${k.key}`} value={k.responsibility} onChange={(e) => updateKid(k.key, { responsibility: e.target.value })} />
                  </Field>
                  <div className="grid gap-1.5 sm:col-span-4">
                    <span className="text-sm font-medium">{t('onboarding.avatar')}</span>
                    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('onboarding.avatar')}>
                      {AVATAR_KEYS.map((a) => (
                        <button
                          key={a}
                          type="button"
                          role="radio"
                          aria-checked={k.avatar === a}
                          aria-label={a}
                          onClick={() => updateKid(k.key, { avatar: a })}
                          className={cn('grid size-9 place-items-center rounded-full text-lg', k.avatar === a ? 'bg-plum-100 ring-2 ring-plum-500 dark:bg-plum-500/30' : 'hover:bg-surface-2')}
                        >
                          {avatarEmoji(a)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:col-span-2">
                    <Field label={t('common.color')} htmlFor={`c-${k.key}`}>
                      <Select id={`c-${k.key}`} value={k.color} onChange={(e) => updateKid(k.key, { color: e.target.value })}>
                        {COLOR_KEYS.map((c) => (
                          <option key={c} value={c}>
                            {t(`colors.${c}`)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <label className="flex items-center justify-between gap-2 text-sm">
                      {t('onboarding.simpleMode')}
                      <Switch checked={k.simple} onCheckedChange={(v) => updateKid(k.key, { simple: v })} />
                    </label>
                  </div>
                </div>
                {kids.length > 1 && (
                  <Button variant="ghost" size="sm" className="mt-3 text-red-600" onClick={() => setKids((ks) => ks.filter((x) => x.key !== k.key))}>
                    <Trash2 /> {t('onboarding.removeChild')}
                  </Button>
                )}
              </fieldset>
            ))}
            <Button variant="outline" onClick={() => setKids((ks) => [...ks, newChild(lang)])}>
              <Plus /> {t('onboarding.addChild')}
            </Button>
          </div>
        ) : step === 2 ? (
          <div className="grid gap-4">
            <p className="text-muted">{t('onboarding.tasksHint')}</p>
            <div className="flex items-start gap-3 rounded-[var(--radius-card)] bg-surface-2 p-4">
              <Checkbox id="starter-tasks" checked={starterTasks} onCheckedChange={(v) => setStarterTasks(v === true)} className="mt-1" />
              <span>
                <label htmlFor="starter-tasks" className="font-medium">{t('onboarding.defaultTasks')}</label>
                <span className="mt-1 block text-sm text-muted">{t('onboarding.defaultTaskList')}</span>
              </span>
            </div>
          </div>
        ) : step === 3 ? (
          <div className="grid gap-5">
            <p className="text-muted">{t('onboarding.scoringHint')}</p>
            <ul className="grid gap-2 text-sm">
              <li className="flex justify-between rounded-lg bg-surface-2 px-3 py-2"><span>{t('scoring.ruleIndependent')}</span><b>+2</b></li>
              <li className="flex justify-between rounded-lg bg-surface-2 px-3 py-2"><span>{t('scoring.ruleReminded')}</span><b>+1</b></li>
              <li className="flex justify-between rounded-lg bg-surface-2 px-3 py-2"><span>{t('scoring.ruleNotDone')}</span><b>0</b></li>
            </ul>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('scoring.initiativePoints')} htmlFor="ip">
                <Input id="ip" type="number" min={0} max={20} value={initiative.points} onChange={(e) => setInitiative({ ...initiative, points: Number(e.target.value) })} />
              </Field>
              <Field label={t('scoring.initiativeCap')} htmlFor="ic">
                <Input id="ic" type="number" min={0} max={50} value={initiative.cap} onChange={(e) => setInitiative({ ...initiative, cap: Number(e.target.value) })} />
              </Field>
            </div>
            <div className="grid gap-2 sm:grid-cols-4">
              {[
                ['🥇', 'الذهبي / Gold', '90–100%', '10 AED'],
                ['🥈', 'الفضي / Silver', '75–89%', '5 AED'],
                ['🥉', 'البرونزي / Bronze', '60–74%', '★'],
                ['🌱', 'في طريق التميّز', '< 60%', '♥'],
              ].map(([icon, name, range, reward]) => (
                <div key={name} className="rounded-[var(--radius-control)] bg-surface-2 p-3 text-center">
                  <div className="text-3xl" aria-hidden>{icon}</div>
                  <div className="mt-1 text-sm font-medium">{name}</div>
                  <div className="text-xs text-muted" dir="ltr">{range}</div>
                  <div className="text-xs font-medium">{reward}</div>
                </div>
              ))}
            </div>
            <p className="flex items-start gap-2 text-sm text-muted">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {t('levels.note')}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            <p className="text-muted">{t('onboarding.inviteHint')}</p>
            <Field label={t('onboarding.inviteEmail')} htmlFor="ie" hint={t('common.optional')}>
              <Input id="ie" type="email" dir="ltr" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            </Field>
          </div>
        )}

        {!running && (
          <div className="mt-8 flex justify-between gap-3">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              {t('common.back')}
            </Button>
            {step < steps.length - 1 ? (
              <Button onClick={next}>{t('common.next')}</Button>
            ) : (
              <Button variant="gold" size="lg" onClick={finish}>
                {t('onboarding.finish')}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function InviteLinkBox({ link }: { link: string }) {
  const { t } = useTranslation();
  return (
    <div className="mt-6 rounded-[var(--radius-card)] bg-surface-2 p-4 text-start">
      <p className="text-sm font-medium">{t('family.inviteLink')}</p>
      <div className="mt-2 flex gap-2">
        <Input readOnly dir="ltr" value={link} onFocus={(e) => e.currentTarget.select()} />
        <Button
          variant="outline"
          size="icon"
          aria-label={t('common.copy')}
          onClick={() => void navigator.clipboard.writeText(link).then(() => toast.success(t('common.copied')))}
        >
          <Copy />
        </Button>
      </div>
      <p className="mt-2 text-sm text-muted">{t('family.inviteShare')}</p>
    </div>
  );
}
