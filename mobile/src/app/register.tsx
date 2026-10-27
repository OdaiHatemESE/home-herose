import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MailCheck from 'lucide-react-native/icons/mail-check';
import { AuthLayout } from '@/components/shell';
import { Btn, ErrorState, Field, Input, PasswordInput, T } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { appLink } from '@/lib/links';
import { supabase } from '@/lib/supabase';
import { brand, useTheme } from '@/lib/theme';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function Register() {
  const { t, i18n } = useTranslation();
  const { c } = useTheme();
  const router = useRouter();
  const [v, setV] = React.useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = React.useState<Partial<Record<keyof typeof v, string>>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const set = (k: keyof typeof v) => (text: string) => setV((s) => ({ ...s, [k]: text }));

  const submit = async () => {
    const e: typeof errors = {};
    if (v.name.trim().length < 2) e.name = t('validation.required');
    if (!EMAIL.test(v.email.trim())) e.email = t('validation.email');
    if (v.password.length < 8) e.password = t('validation.passwordMin');
    if (v.password !== v.confirm) e.confirm = t('validation.passwordsMatch');
    setErrors(e);
    if (Object.keys(e).length) return;
    setError(null);
    setBusy(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: v.email.trim(),
      password: v.password,
      options: { data: { display_name: v.name.trim(), locale: i18n.language }, emailRedirectTo: appLink('/onboarding') },
    });
    setBusy(false);
    if (err) return setError(errorMessage(err));
    // with e-mail confirmation off a session comes back at once and the app moves to onboarding
    if (!data.session) setSentTo(v.email.trim());
  };

  if (sentTo) {
    return (
      <AuthLayout title={t('auth.registerTitle')}>
        <View style={{ alignItems: 'center', gap: 14 }}>
          <MailCheck size={52} color={brand.leaf500} />
          <T align="center">{t('auth.registerDone', { email: sentTo })}</T>
          <Btn variant="outline" onPress={() => router.replace('/login')}>
            {t('auth.loginCta')}
          </Btn>
        </View>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t('auth.registerTitle')}>
      <View style={{ gap: 14 }}>
        {error && <ErrorState message={error} />}
        <Field label={t('auth.yourName')} error={errors.name}>
          <Input value={v.name} onChangeText={set('name')} autoComplete="name" invalid={!!errors.name} />
        </Field>
        <Field label={t('auth.email')} error={errors.email}>
          <Input ltr value={v.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" invalid={!!errors.email} />
        </Field>
        <Field label={t('auth.password')} error={errors.password}>
          <PasswordInput ltr value={v.password} onChangeText={set('password')} autoComplete="new-password" invalid={!!errors.password} />
        </Field>
        <Field label={t('auth.confirmPassword')} error={errors.confirm}>
          <PasswordInput ltr value={v.confirm} onChangeText={set('confirm')} autoComplete="new-password" invalid={!!errors.confirm} onSubmitEditing={submit} />
        </Field>
        <Btn size="lg" onPress={submit} loading={busy}>
          {t('auth.registerCta')}
        </Btn>
        <T size={14} align="center" color={c.primaryText} onPress={() => router.replace('/login')} accessibilityRole="link">
          {t('auth.haveAccount')}
        </T>
      </View>
    </AuthLayout>
  );
}
