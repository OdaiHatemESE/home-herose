import * as React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';
import { AuthCard } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/brand/misc';

export default function ParentLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const schema = z.object({
    email: z.string().trim().email(t('validation.email')),
    password: z.string().min(1, t('validation.required')),
  });
  type Values = z.infer<typeof schema>;
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(schema) });
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: v.email, password: v.password });
    if (err) return setError(errorMessage(err));
    navigate(loc.state?.from ?? '/parent', { replace: true });
  });

  return (
    <AuthCard title={t('auth.loginTitle')}>
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        {error && <ErrorState message={error} />}
        <Field label={t('auth.email')} htmlFor="email" error={formState.errors.email?.message}>
          <Input id="email" type="email" dir="ltr" autoComplete="email" {...register('email')} aria-invalid={!!formState.errors.email} />
        </Field>
        <Field label={t('auth.password')} htmlFor="password" error={formState.errors.password?.message}>
          <Input id="password" type="password" dir="ltr" autoComplete="current-password" {...register('password')} aria-invalid={!!formState.errors.password} />
        </Field>
        <Button type="submit" size="lg" loading={formState.isSubmitting}>
          {t('auth.loginCta')}
        </Button>
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <Link to="/forgot-password" className="text-plum-600 hover:underline dark:text-plum-200">
            {t('auth.forgot')}
          </Link>
          <Link to="/register" className="text-plum-600 hover:underline dark:text-plum-200">
            {t('auth.noAccount')}
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}
