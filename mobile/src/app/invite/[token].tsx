import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Users from 'lucide-react-native/icons/users';
import { useAuth } from '@/auth/AuthProvider';
import { AuthLayout } from '@/components/shell';
import { toast } from '@/components/toast';
import { Btn, ErrorState, Row, T } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { setPref } from '@/lib/prefs';
import { supabase } from '@/lib/supabase';
import { brand, useTheme } from '@/lib/theme';

export default function AcceptInvite() {
  const { token = '' } = useLocalSearchParams<{ token: string }>();
  const { t } = useTranslation();
  const { c } = useTheme();
  const router = useRouter();
  const { session, identity, refreshIdentity } = useAuth();
  const [busy, setBusy] = React.useState(false);
  const info = useQuery({
    queryKey: ['invitation', token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_invitation', { p_token: token });
      if (error) throw error;
      return data!;
    },
  });

  // remembered so a parent who first has to register comes back here afterwards;
  // forgotten again when the invitation is no longer valid
  React.useEffect(() => {
    if (!token || info.isPending) return;
    void setPref('pending-invite', info.data?.valid ? token : null);
  }, [token, info.isPending, info.data?.valid]);

  if (info.isPending) {
    return (
      <AuthLayout title={t('auth.inviteTitle')}>
        <ActivityIndicator color={brand.plum500} />
      </AuthLayout>
    );
  }
  if (!info.data?.valid) {
    return (
      <AuthLayout title={t('auth.inviteTitle')}>
        <ErrorState message={t('auth.inviteInvalid')} />
      </AuthLayout>
    );
  }

  const accept = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('accept_invitation', { p_token: token, p_display_name: null });
    setBusy(false);
    if (error) return toast.error(errorMessage(error));
    await setPref('pending-invite', null);
    toast.success(t('auth.inviteAccepted'));
    await refreshIdentity();
    router.replace('/parent');
  };

  return (
    <AuthLayout title={t('auth.inviteTitle')}>
      <View style={{ alignItems: 'center', gap: 14 }}>
        <Users size={52} color={brand.plum500} />
        <T size={18} align="center">
          {t('auth.inviteBody', { inviter: info.data.inviter_name ?? '', family: info.data.family_name })}
        </T>
        {!!info.data.email && (
          <T size={13.5} color={c.muted} align="center">
            {t('auth.inviteEmailHint', { email: info.data.email })}
          </T>
        )}
        {session && identity.kind !== 'child' ? (
          <Btn size="lg" onPress={accept} loading={busy} block>
            {t('auth.inviteAccept')}
          </Btn>
        ) : (
          <>
            <T color={c.muted} align="center">
              {t('auth.inviteSignIn')}
            </T>
            <Row gap={10}>
              <Btn onPress={() => router.push('/login')}>{t('auth.loginCta')}</Btn>
              <Btn variant="outline" onPress={() => router.push('/register')}>
                {t('auth.registerCta')}
              </Btn>
            </Row>
          </>
        )}
      </View>
    </AuthLayout>
  );
}
