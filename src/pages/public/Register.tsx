import * as React from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { MailCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';
import { AuthCard } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/brand/misc';

export function redirectUrl(path: string) {
  return `${window.location.origin}${window.location.pathname}#${path}`;
}

export default function Register() {
  const { t, i18n } = useTranslation();
  const schema = z
    .object({
      name: z.string().trim().min(2, t('validation.required')),
      email: z.string().trim().email(t('validation.email')),
      password: z.string().min(8, t('validation.passwordMin')),
      confirm: z.string(),
    })
    .refine((v) => v.password === v.confirm, { path: ['confirm'], message: t('validation.passwordsMatch') });
  type Values = z.infer<typeof schema>;
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(schema) });
  const [error, setError] = React.useState<string | null>(null);
  const [sentTo, setSentTo] = React.useState<string | null>(null);

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    const { data, error: err } = await supabase.auth.signUp({
      email: v.email,
      password: v.password,
      options: { data: { display_name: v.name, locale: i18n.language }, emailRedirectTo: redirectUrl('/onboarding') },
    });
    if (err) return setError(errorMessage(err));
    // with email confirmation disabled, a session is returned immediately
    if (!data.session) setSentTo(v.email);
  });

  if (sentTo) {
    return (
      <AuthCard title={t('auth.registerTitle')}>
        <div className="flex flex-col items-center gap-3 text-center">
          <MailCheck className="size-12 text-leaf-500" aria-hidden />
          <p>{t('auth.registerDone', { email: sentTo })}</p>
          <Button asChild variant="outline">
            <Link to="/login">{t('auth.loginCta')}</Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('auth.registerTitle')}>
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        {error && <ErrorState message={error} />}
        <Field label={t('auth.yourName')} htmlFor="name" error={formState.errors.name?.message}>
          <Input id="name" autoComplete="name" {...register('name')} aria-invalid={!!formState.errors.name} />
        </Field>
        <Field label={t('auth.email')} htmlFor="email" error={formState.errors.email?.message}>
          <Input id="email" type="email" dir="ltr" autoComplete="email" {...register('email')} aria-invalid={!!formState.errors.email} />
        </Field>
        <Field label={t('auth.password')} htmlFor="password" error={formState.errors.password?.message}>
          <Input id="password" type="password" dir="ltr" autoComplete="new-password" {...register('password')} aria-invalid={!!formState.errors.password} />
        </Field>
        <Field label={t('auth.confirmPassword')} htmlFor="confirm" error={formState.errors.confirm?.message}>
          <Input id="confirm" type="password" dir="ltr" autoComplete="new-password" {...register('confirm')} aria-invalid={!!formState.errors.confirm} />
        </Field>
        <Button type="submit" size="lg" loading={formState.isSubmitting}>
          {t('auth.registerCta')}
        </Button>
        <Link to="/login" className="text-center text-sm text-plum-600 hover:underline dark:text-plum-200">
          {t('auth.haveAccount')}
        </Link>
      </form>
    </AuthCard>
  );
}
