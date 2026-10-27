import * as React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { childSignIn } from '@/auth/AuthProvider';
import { AuthLayout } from '@/components/shell';
import { Btn, CheckBox, ErrorState, Field, Input, PasswordInput, T } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { getPref, setPref } from '@/lib/prefs';
import { useTheme } from '@/lib/theme';

export default function ChildLogin() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const [familyCode, setFamilyCode] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [secret, setSecret] = React.useState('');
  const [remember, setRemember] = React.useState(false);
  const [errors, setErrors] = React.useState<{ familyCode?: string; username?: string; secret?: string }>({});
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    void getPref('family-code').then((code) => {
      if (code) {
        setFamilyCode(code);
        setRemember(true);
      }
    });
  }, []);

  const submit = async () => {
    const e: typeof errors = {};
    if (familyCode.trim().length < 6) e.familyCode = t('validation.required');
    if (username.trim().length < 3) e.username = t('validation.required');
    if (!secret) e.secret = t('validation.required');
    setErrors(e);
    if (Object.keys(e).length) return;
    setError(null);
    setBusy(true);
    try {
      await childSignIn(familyCode, username, secret);
      await setPref('family-code', remember ? familyCode.trim().toUpperCase() : null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout kid title={t('auth.childTitle')} subtitle={t('auth.childSubtitle')}>
      <View style={{ gap: 14 }}>
        {error && <ErrorState message={error} />}
        <Field label={t('auth.familyCode')} error={errors.familyCode}>
          <Input
            ltr
            big
            center
            value={familyCode}
            onChangeText={(x) => setFamilyCode(x.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            style={{ letterSpacing: 6, fontWeight: '600' }}
            invalid={!!errors.familyCode}
          />
        </Field>
        <Field label={t('auth.username')} error={errors.username}>
          <Input ltr big value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} autoComplete="username" invalid={!!errors.username} />
        </Field>
        <Field label={t('auth.secret')} error={errors.secret}>
          <PasswordInput big value={secret} onChangeText={setSecret} invalid={!!errors.secret} onSubmitEditing={submit} />
        </Field>
        <CheckBox checked={remember} onChange={setRemember} label={t('auth.rememberFamily')} />
        <Btn size="xl" variant="gold" onPress={submit} loading={busy}>
          {`${t('auth.childCta')} ⭐`}
        </Btn>
        <T size={13.5} color={c.muted} align="center">
          {t('auth.childHelp')}
        </T>
      </View>
    </AuthLayout>
  );
}
