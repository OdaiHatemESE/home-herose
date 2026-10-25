import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';
import { useAuth } from '@/auth/AuthProvider';
import { AuthCard } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/brand/misc';
import { FullPageLoader } from '@/components/layout/FullPageLoader';

const PENDING_INVITE = 'hh-pending-invite';

export default function AcceptInvite() {
  const { token = '' } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { ready, session, identity, refreshIdentity } = useAuth();
  const [busy, setBusy] = React.useState(false);
  const info = useQuery({
    queryKey: ['invitation', token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_invitation', { p_token: token });
      if (error) throw error;
      return data!;
    },
  });

  React.useEffect(() => {
    try {
      sessionStorage.setItem(PENDING_INVITE, token);
    } catch {
      /* ignore */
    }
  }, [token]);

  if (!ready || info.isPending) return <FullPageLoader />;
  if (!info.data?.valid) {
    return (
      <AuthCard title={t('auth.inviteTitle')}>
        <ErrorState message={t('auth.inviteInvalid')} />
      </AuthCard>
    );
  }

  const accept = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('accept_invitation', { p_token: token, p_display_name: null });
    setBusy(false);
    if (error) return toast.error(errorMessage(error));
    try {
      sessionStorage.removeItem(PENDING_INVITE);
    } catch {
      /* ignore */
    }
    toast.success(t('auth.inviteAccepted'));
    await refreshIdentity();
    navigate('/parent', { replace: true });
  };

  return (
    <AuthCard title={t('auth.inviteTitle')}>
      <div className="flex flex-col items-center gap-4 text-center">
        <Users className="size-12 text-plum-500" aria-hidden />
        <p className="text-lg">{t('auth.inviteBody', { inviter: info.data.inviter_name ?? '', family: info.data.family_name })}</p>
        {info.data.email && <p className="text-sm text-muted">{t('auth.inviteEmailHint', { email: info.data.email })}</p>}
        {session && identity.kind !== 'child' ? (
          <Button size="lg" onClick={accept} loading={busy}>
            {t('auth.inviteAccept')}
          </Button>
        ) : (
          <>
            <p className="text-muted">{t('auth.inviteSignIn')}</p>
            <div className="flex gap-2">
              <Button asChild>
                <Link to="/login" state={{ from: `/invite/${token}` }}>
                  {t('auth.loginCta')}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/register">{t('auth.registerCta')}</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </AuthCard>
  );
}

export function pendingInviteToken(): string | null {
  try {
    return sessionStorage.getItem(PENDING_INVITE);
  } catch {
    return null;
  }
}
