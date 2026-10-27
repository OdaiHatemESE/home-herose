import * as React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '@/components/shell';
import { Btn, Field, Input, T } from '@/components/ui';
import { appLink } from '@/lib/links';
import { supabase } from '@/lib/supabase';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = React.useState('');
  const [err, setErr] = React.useState<string | undefined>();
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const submit = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setErr(t('validation.email'));
    setErr(undefined);
    setBusy(true);
    // always report success so registered addresses cannot be discovered
    await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: appLink('/reset-password') });
    setBusy(false);
    setSent(true);
  };

  return (
    <AuthLayout title={t('auth.forgotTitle')}>
      {sent ? (
        <T accessibilityRole="alert">{t('auth.forgotSent')}</T>
      ) : (
        <View style={{ gap: 14 }}>
          <Field label={t('auth.email')} error={err}>
            <Input ltr value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" invalid={!!err} onSubmitEditing={submit} />
          </Field>
          <Btn size="lg" onPress={submit} loading={busy}>
            {t('auth.forgotCta')}
          </Btn>
        </View>
      )}
    </AuthLayout>
  );
}
