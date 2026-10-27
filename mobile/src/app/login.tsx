import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '@/components/shell';
import { Btn, ErrorState, Field, Input, PasswordInput, Row, T } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function ParentLogin() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [errors, setErrors] = React.useState<{ email?: string; password?: string }>({});
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    const e: typeof errors = {};
    if (!EMAIL.test(email.trim())) e.email = t('validation.email');
    if (!password) e.password = t('validation.required');
    setErrors(e);
    if (Object.keys(e).length) return;
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) setError(errorMessage(err));
    // on success the root layout moves to the parent area automatically
  };

  return (
    <AuthLayout title={t('auth.loginTitle')}>
      <View style={{ gap: 14 }}>
        {error && <ErrorState message={error} />}
        <Field label={t('auth.email')} error={errors.email}>
          <Input ltr value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" invalid={!!errors.email} returnKeyType="next" />
        </Field>
        <Field label={t('auth.password')} error={errors.password}>
          <PasswordInput ltr value={password} onChangeText={setPassword} autoComplete="current-password" textContentType="password" invalid={!!errors.password} onSubmitEditing={submit} returnKeyType="go" />
        </Field>
        <Btn size="lg" onPress={submit} loading={busy}>
          {t('auth.loginCta')}
        </Btn>
        <Row justify="space-between" wrap gap={8}>
          <T size={14} color={c.primaryText} onPress={() => router.push('/forgot-password')} accessibilityRole="link">
            {t('auth.forgot')}
          </T>
          <T size={14} color={c.primaryText} onPress={() => router.replace('/register')} accessibilityRole="link">
            {t('auth.noAccount')}
          </T>
        </Row>
      </View>
    </AuthLayout>
  );
}
