import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { AuthCard } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { redirectUrl } from './Register';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const schema = z.object({ email: z.string().trim().email(t('validation.email')) });
  const { register, handleSubmit, formState } = useForm<{ email: string }>({ resolver: zodResolver(schema) });
  const [sent, setSent] = React.useState(false);

  const onSubmit = handleSubmit(async (v) => {
    // always report success so registered emails can't be discovered
    await supabase.auth.resetPasswordForEmail(v.email, { redirectTo: redirectUrl('/reset-password') });
    setSent(true);
  });

  return (
    <AuthCard title={t('auth.forgotTitle')}>
      {sent ? (
        <p role="status">{t('auth.forgotSent')}</p>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <Field label={t('auth.email')} htmlFor="email" error={formState.errors.email?.message}>
            <Input id="email" type="email" dir="ltr" autoComplete="email" {...register('email')} />
          </Field>
          <Button type="submit" size="lg" loading={formState.isSubmitting}>
            {t('auth.forgotCta')}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
