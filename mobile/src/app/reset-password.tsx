import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthProvider';
import { AuthLayout } from '@/components/shell';
import { toast } from '@/components/toast';
import { Btn, ErrorState, Field, PasswordInput } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

export default function ResetPassword() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useAuth();
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [errors, setErrors] = React.useState<{ password?: string; confirm?: string }>({});
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  if (!session) {
    return (
      <AuthLayout title={t('auth.resetTitle')}>
        <ErrorState message={t('errors.not_authenticated')} />
      </AuthLayout>
    );
  }

  const submit = async () => {
    const e: typeof errors = {};
    if (password.length < 8) e.password = t('validation.passwordMin');
    if (password !== confirm) e.confirm = t('validation.passwordsMatch');
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(errorMessage(err));
    toast.success(t('auth.resetDone'));
    router.replace('/');
  };

  return (
    <AuthLayout title={t('auth.resetTitle')}>
      <View style={{ gap: 14 }}>
        {error && <ErrorState message={error} />}
        <Field label={t('auth.password')} error={errors.password}>
          <PasswordInput ltr value={password} onChangeText={setPassword} autoComplete="new-password" invalid={!!errors.password} />
        </Field>
        <Field label={t('auth.confirmPassword')} error={errors.confirm}>
          <PasswordInput ltr value={confirm} onChangeText={setConfirm} autoComplete="new-password" invalid={!!errors.confirm} onSubmitEditing={submit} />
        </Field>
        <Btn size="lg" onPress={submit} loading={busy}>
          {t('auth.resetCta')}
        </Btn>
      </View>
    </AuthLayout>
  );
}
