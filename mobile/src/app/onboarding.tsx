import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import Check from 'lucide-react-native/icons/check';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import Copy from 'lucide-react-native/icons/copy';
import Plus from 'lucide-react-native/icons/plus';
import RefreshCw from 'lucide-react-native/icons/refresh-cw';
import Trash from 'lucide-react-native/icons/trash';
import WandSparkles from 'lucide-react-native/icons/wand-sparkles';
import { familyApi } from '@/api/family';
import { useAuth } from '@/auth/AuthProvider';
import { TrophyMark } from '@/components/brand';
import { PublicShell } from '@/components/shell';
import { toast } from '@/components/toast';
import { Btn, Card, CheckBox, ErrorState, Field, Grid, IconBtn, Input, Row, Select, T, Toggle } from '@/components/ui';
import { useDir } from '@/i18n';
import { WEBSITE_URL } from '@/lib/config';
import { errorMessage } from '@/lib/errors';
import { AVATAR_KEYS, avatarEmoji, COLOR_KEYS } from '@/lib/icons';
import { useLayout } from '@/lib/layout';
import { getPref } from '@/lib/prefs';
import { secretProblem, suggestSecret, suggestUsername, uuid } from '@/lib/secrets';
import { supabase } from '@/lib/supabase';
import { brand, R, useTheme } from '@/lib/theme';

type DraftChild = { key: string; name: string; age: string; username: string; secret: string; responsibility: string; avatar: string; color: string; simple: boolean };

const TIMEZONES = ['Asia/Dubai', 'Asia/Riyadh', 'Asia/Qatar', 'Asia/Kuwait', 'Asia/Bahrain', 'Asia/Muscat', 'Africa/Cairo', 'Asia/Amman', 'Europe/London', 'America/New_York'];
const CURRENCIES = ['AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'EGP', 'JOD', 'GBP', 'USD', 'EUR'];

function newChild(lang: string, partial: Partial<DraftChild> = {}): DraftChild {
  return {
    key: uuid(),
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

function deviceTimezone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz && TIMEZONES.includes(tz) ? tz : 'Asia/Dubai';
  } catch {
    return 'Asia/Dubai';
  }
}

/** Same five steps and the same server calls as the website's onboarding. */
export default function Onboarding() {
  const { t, i18n } = useTranslation();
  const { c } = useTheme();
  const L = useLayout();
  const dir = useDir();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { session, refreshIdentity } = useAuth();
  const lang = i18n.language;

  React.useEffect(() => {
    void getPref('pending-invite').then((token) => {
      if (token) router.replace(`/invite/${token}`);
    });
  }, [router]);

  const [step, setStep] = React.useState(0);
  const [family, setFamily] = React.useState({
    name: '',
    parentName: (session?.user.user_metadata?.display_name as string) ?? '',
    timezone: deviceTimezone(),
    currency: 'AED',
  });
  const [kids, setKids] = React.useState<DraftChild[]>(() => [newChild(lang)]);
  const [starterTasks, setStarterTasks] = React.useState(true);
  const [initiative, setInitiative] = React.useState({ points: '1', cap: '2' });
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [errors, setErrors] = React.useState<string[]>([]);
  const [running, setRunning] = React.useState<null | { label: string; done: string[] }>(null);
  const [inviteLink, setInviteLink] = React.useState<string | null>(null);
  const [finished, setFinished] = React.useState(false);
  const scrollRef = React.useRef<ScrollView>(null);

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
    if (step === 3) {
      const ip = Number(initiative.points);
      const ic = Number(initiative.cap);
      if (!Number.isInteger(ip) || ip < 0 || ip > 20 || !Number.isInteger(ic) || ic < 0 || ic > 50) errs.push(t('errors.invalid_points'));
    }
    if (step === 4 && inviteEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(inviteEmail)) errs.push(t('validation.email'));
    return errs;
  };

  const goto = (s: number) => {
    setStep(s);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };
  const next = () => {
    const errs = validateStep();
    setErrors(errs);
    if (errs.length === 0) goto(step + 1);
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
      const ip = Number(initiative.points);
      const ic = Number(initiative.cap);
      if (ip !== 1 || ic !== 2) {
        await supabase.from('family_settings').update({ initiative_points: ip, initiative_daily_cap: ic }).eq('family_id', familyId);
      }
      if (inviteEmail.trim()) {
        setRunning({ label: t('onboarding.progressInvite'), done: [...done] });
        const inv = await familyApi.createInvitation({ familyId, email: inviteEmail.trim() });
        setInviteLink(`${WEBSITE_URL}#/invite/${(inv as { token: string }).token}`);
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
  };

  const body = finished ? (
    <View style={{ alignItems: 'center', gap: 16, paddingVertical: 24 }}>
      <TrophyMark size={88} />
      <T display size={34} align="center" color={c.dark ? brand.plum200 : brand.plum600}>
        {t('onboarding.done')}
      </T>
      {errors.length > 0 && <ErrorState message={errors.join(' — ')} />}
      {inviteLink && <InviteLinkBox link={inviteLink} />}
      <Btn size="xl" variant="gold" onPress={goToDashboard}>
        {t('onboarding.finish')}
      </Btn>
    </View>
  ) : (
    <>
      <T display size={L.tablet ? 44 : 34} color={c.dark ? brand.plum200 : brand.plum600}>
        {t('onboarding.title')}
      </T>
      <View accessibilityLabel={t('onboarding.step', { current: step + 1, total: steps.length })} style={{ flexDirection: dir.row, flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
        {steps.map((s, i) => {
          const active = i === step;
          const past = i < step;
          return (
            <Row
              key={s}
              gap={6}
              style={{
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 5,
                backgroundColor: active ? brand.plum500 : past ? (c.dark ? 'rgba(31,169,113,0.2)' : brand.leaf100) : c.surface2,
              }}
            >
              {past ? <Check size={15} color={brand.leaf500} /> : <T size={13} w="semibold" color={active ? '#fff' : c.muted}>{String(i + 1)}</T>}
              <T size={13} color={active ? '#fff' : past ? brand.leaf500 : c.muted}>
                {s}
              </T>
            </Row>
          );
        })}
      </View>

      <Card style={{ marginTop: 18, borderRadius: R.hero, padding: L.tablet ? 26 : 18 }}>
        {errors.length > 0 && !running && (
          <View style={{ marginBottom: 16 }}>
            <ErrorState message={errors.join(' — ')} />
          </View>
        )}

        {running ? (
          <View accessibilityRole="alert" style={{ gap: 12, paddingVertical: 16 }}>
            <T w="semibold">{t('onboarding.creating')}</T>
            {running.done.map((d) => (
              <Row key={d} gap={8}>
                <Check size={20} color={brand.leaf500} />
                <T color={brand.leaf500}>{d}</T>
              </Row>
            ))}
            <Row gap={8}>
              <ActivityIndicator color={brand.plum500} />
              <T color={c.muted}>{running.label}</T>
            </Row>
          </View>
        ) : step === 0 ? (
          <View style={{ gap: 14 }}>
            <Field label={t('onboarding.familyName')}>
              <Input value={family.name} placeholder={t('onboarding.familyNamePlaceholder')} onChangeText={(x) => setFamily({ ...family, name: x })} />
            </Field>
            <Field label={t('onboarding.parentName')}>
              <Input value={family.parentName} placeholder={t('onboarding.parentNamePlaceholder')} onChangeText={(x) => setFamily({ ...family, parentName: x })} />
            </Field>
            <Grid cols={L.cols(1, 2)} gap={14}>
              <Field label={t('onboarding.timezone')}>
                <Select ltr label={t('onboarding.timezone')} value={family.timezone} onChange={(v) => setFamily({ ...family, timezone: v })} options={TIMEZONES.map((z) => ({ value: z, label: z }))} />
              </Field>
              <Field label={t('onboarding.currency')}>
                <Select ltr label={t('onboarding.currency')} value={family.currency} onChange={(v) => setFamily({ ...family, currency: v })} options={CURRENCIES.map((x) => ({ value: x, label: x }))} />
              </Field>
            </Grid>
          </View>
        ) : step === 1 ? (
          <View style={{ gap: 16 }}>
            <T color={c.muted}>{t('onboarding.childrenHint')}</T>
            <Btn variant="soft" onPress={useTemplate} icon={(col, s) => <WandSparkles size={s} color={col} />}>
              {t('onboarding.useTemplate')}
            </Btn>
            <T size={13} color={c.muted}>
              {t('onboarding.templateHint')}
            </T>
            {kids.map((k, idx) => (
              <View key={k.key} style={{ borderRadius: R.card, borderWidth: 1, borderColor: c.border, padding: 14, gap: 12 }}>
                <Row gap={8}>
                  <Text style={{ fontSize: 22 }}>{avatarEmoji(k.avatar)}</Text>
                  <View style={{ flex: 1 }}>
                    <T w="semibold">{k.name || `${t('onboarding.childName')} ${idx + 1}`}</T>
                  </View>
                  {kids.length > 1 && (
                    <IconBtn onPress={() => setKids((ks) => ks.filter((x) => x.key !== k.key))} label={t('onboarding.removeChild')}>
                      <Trash size={18} color={brand.red600} />
                    </IconBtn>
                  )}
                </Row>
                <Grid cols={L.cols(1, 2)} gap={12}>
                  <Field label={t('onboarding.childName')}>
                    <Input
                      value={k.name}
                      onChangeText={(x) => updateKid(k.key, { name: x })}
                      onBlur={() => !k.username && k.name && updateKid(k.key, { username: suggestUsername(k.name, kids.map((x) => x.username)) })}
                    />
                  </Field>
                  <Grid cols={2} gap={12}>
                    <Field label={t('onboarding.childAge')}>
                      <Input value={k.age} keyboardType="number-pad" onChangeText={(x) => updateKid(k.key, { age: x.replace(/\D/g, '') })} />
                    </Field>
                    <Field label={t('onboarding.childUsername')}>
                      <Input ltr value={k.username} autoCapitalize="none" autoCorrect={false} onChangeText={(x) => updateKid(k.key, { username: x.toLowerCase().trim() })} />
                    </Field>
                  </Grid>
                  <Field label={t('onboarding.childSecret')} hint={t('onboarding.childSecretHint')}>
                    <Input
                      value={k.secret}
                      autoCapitalize="none"
                      onChangeText={(x) => updateKid(k.key, { secret: x })}
                      trailing={
                        <IconBtn onPress={() => updateKid(k.key, { secret: suggestSecret(lang) })} label={t('family.resetSecret')} size={36}>
                          <RefreshCw size={18} color={c.muted} />
                        </IconBtn>
                      }
                    />
                  </Field>
                  <Field label={t('onboarding.responsibility')}>
                    <Input value={k.responsibility} onChangeText={(x) => updateKid(k.key, { responsibility: x })} />
                  </Field>
                </Grid>
                <Field label={t('onboarding.avatar')}>
                  <View accessibilityRole="radiogroup" style={{ flexDirection: dir.row, flexWrap: 'wrap', gap: 6 }}>
                    {AVATAR_KEYS.map((a) => {
                      const on = k.avatar === a;
                      return (
                        <Pressable
                          key={a}
                          onPress={() => updateKid(k.key, { avatar: a })}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: on }}
                          accessibilityLabel={a}
                          style={{
                            width: L.tablet ? 44 : 40,
                            height: L.tablet ? 44 : 40,
                            borderRadius: 22,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: on ? (c.dark ? 'rgba(109,63,214,0.3)' : brand.plum100) : 'transparent',
                            borderWidth: 2,
                            borderColor: on ? brand.plum500 : 'transparent',
                          }}
                        >
                          <Text style={{ fontSize: 20 }}>{avatarEmoji(a)}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </Field>
                <Grid cols={L.cols(1, 2)} gap={12}>
                  <Field label={t('common.color')}>
                    <Select label={t('common.color')} value={k.color} onChange={(v) => updateKid(k.key, { color: v })} options={COLOR_KEYS.map((x) => ({ value: x, label: t(`colors.${x}`) }))} />
                  </Field>
                  <View style={{ justifyContent: 'flex-end' }}>
                    <Toggle label={t('onboarding.simpleMode')} value={k.simple} onChange={(v) => updateKid(k.key, { simple: v })} />
                  </View>
                </Grid>
              </View>
            ))}
            <Btn variant="outline" onPress={() => setKids((ks) => [...ks, newChild(lang)])} icon={(col, s) => <Plus size={s} color={col} />}>
              {t('onboarding.addChild')}
            </Btn>
          </View>
        ) : step === 2 ? (
          <View style={{ gap: 14 }}>
            <T color={c.muted}>{t('onboarding.tasksHint')}</T>
            <View style={{ backgroundColor: c.surface2, borderRadius: R.card, padding: 14 }}>
              <CheckBox
                checked={starterTasks}
                onChange={setStarterTasks}
                label={
                  <View style={{ gap: 4 }}>
                    <T w="medium">{t('onboarding.defaultTasks')}</T>
                    <T size={13.5} color={c.muted}>
                      {t('onboarding.defaultTaskList')}
                    </T>
                  </View>
                }
              />
            </View>
          </View>
        ) : step === 3 ? (
          <View style={{ gap: 16 }}>
            <T color={c.muted}>{t('onboarding.scoringHint')}</T>
            <View style={{ gap: 8 }}>
              {[
                [t('scoring.ruleIndependent'), '+2'],
                [t('scoring.ruleReminded'), '+1'],
                [t('scoring.ruleNotDone'), '0'],
              ].map(([label, pts]) => (
                <Row key={label} justify="space-between" style={{ backgroundColor: c.surface2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 }}>
                  <View style={{ flex: 1 }}>
                    <T size={14}>{label}</T>
                  </View>
                  <T size={14} w="bold" ltr>
                    {pts}
                  </T>
                </Row>
              ))}
            </View>
            <Grid cols={2} gap={12}>
              <Field label={t('scoring.initiativePoints')}>
                <Input keyboardType="number-pad" value={initiative.points} onChangeText={(x) => setInitiative({ ...initiative, points: x.replace(/\D/g, '') })} />
              </Field>
              <Field label={t('scoring.initiativeCap')}>
                <Input keyboardType="number-pad" value={initiative.cap} onChangeText={(x) => setInitiative({ ...initiative, cap: x.replace(/\D/g, '') })} />
              </Field>
            </Grid>
            <Grid cols={L.cols(2, 4)} gap={10}>
              {[
                ['🥇', 'الذهبي / Gold', '90–100%', '10 AED'],
                ['🥈', 'الفضي / Silver', '75–89%', '5 AED'],
                ['🥉', 'البرونزي / Bronze', '60–74%', '★'],
                ['🌱', 'في طريق التميّز', '< 60%', '♥'],
              ].map(([icon, name, range, reward]) => (
                <View key={name} style={{ backgroundColor: c.surface2, borderRadius: R.control, padding: 12, alignItems: 'center', gap: 2 }}>
                  <Text style={{ fontSize: 30 }}>{icon}</Text>
                  <T size={13.5} w="medium" align="center">
                    {name}
                  </T>
                  <T size={12} color={c.muted} ltr align="center">
                    {range}
                  </T>
                  <T size={12} w="medium" align="center">
                    {reward}
                  </T>
                </View>
              ))}
            </Grid>
            <Row gap={8} align="flex-start">
              <CircleAlert size={16} color={c.muted} style={{ marginTop: 3 }} />
              <View style={{ flex: 1 }}>
                <T size={13.5} color={c.muted}>
                  {t('levels.note')}
                </T>
              </View>
            </Row>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            <T color={c.muted}>{t('onboarding.inviteHint')}</T>
            <Field label={t('onboarding.inviteEmail')} hint={t('common.optional')}>
              <Input ltr keyboardType="email-address" autoCapitalize="none" value={inviteEmail} onChangeText={setInviteEmail} />
            </Field>
          </View>
        )}

        {!running && (
          <Row justify="space-between" gap={12} style={{ marginTop: 24 }}>
            <Btn variant="ghost" onPress={() => goto(Math.max(0, step - 1))} disabled={step === 0}>
              {t('common.back')}
            </Btn>
            {step < steps.length - 1 ? (
              <Btn onPress={next}>{t('common.next')}</Btn>
            ) : (
              <Btn variant="gold" size="lg" onPress={finish}>
                {t('onboarding.finish')}
              </Btn>
            )}
          </Row>
        )}
      </Card>
    </>
  );

  return (
    <PublicShell>
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingHorizontal: L.gutter, paddingTop: 12, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
        <View style={{ maxWidth: 860, width: '100%', alignSelf: 'center' }}>{body}</View>
      </ScrollView>
    </PublicShell>
  );
}

export function InviteLinkBox({ link }: { link: string }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  return (
    <View style={{ backgroundColor: c.surface2, borderRadius: R.card, padding: 14, gap: 8, width: '100%' }}>
      <T size={14} w="medium">
        {t('family.inviteLink')}
      </T>
      <Input
        ltr
        value={link}
        editable={false}
        selectTextOnFocus
        trailing={
          <IconBtn onPress={() => void Clipboard.setStringAsync(link).then(() => toast.success(t('common.copied')))} label={t('common.copy')} size={36}>
            <Copy size={18} color={c.muted} />
          </IconBtn>
        }
      />
      <T size={13} color={c.muted}>
        {t('family.inviteShare')}
      </T>
    </View>
  );
}
