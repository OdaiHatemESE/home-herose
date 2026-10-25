import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';
import { useAuth } from '@/auth/AuthProvider';
import { AuthCard } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/brand/misc';
import { FullPageLoader } from '@/components/layout/FullPageLoader';

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { ready, session } = useAuth();
  const schema = z
    .object({ password: z.string().min(8, t('validation.passwordMin')), confirm: z.string() })
    .refine((v) => v.password === v.confirm, { path: ['confirm'], message: t('validation.passwordsMatch') });
  const { register, handleSubmit, formState } = useForm<{ password: string; confirm: string }>({ resolver: zodResolver(schema) });
  const [error, setError] = React.useState<string | null>(null);

  if (!ready) return <FullPageLoader />;
  if (!session) return <AuthCard title={t('auth.resetTitle')}><ErrorState message={t('errors.not_authenticated')} /></AuthCard>;

  const onSubmit = handleSubmit(async (v) => {
    const { error: err } = await supabase.auth.updateUser({ password: v.password });
    if (err) return setError(errorMessage(err));
    toast.success(t('auth.resetDone'));
    navigate('/parent', { replace: true });
  });

  return (
    <AuthCard title={t('auth.resetTitle')}>
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        {error && <ErrorState message={error} />}
        <Field label={t('auth.password')} htmlFor="password" error={formState.errors.password?.message}>
          <Input id="password" type="password" dir="ltr" autoComplete="new-password" {...register('password')} />
        </Field>
        <Field label={t('auth.confirmPassword')} htmlFor="confirm" error={formState.errors.confirm?.message}>
          <Input id="confirm" type="password" dir="ltr" autoComplete="new-password" {...register('confirm')} />
        </Field>
        <Button type="submit" size="lg" loading={formState.isSubmitting}>
          {t('auth.resetCta')}
        </Button>
      </form>
    </AuthCard>
  );
}
