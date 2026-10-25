import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { childSignIn } from '@/auth/AuthProvider';
import { errorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/controls';
import { ErrorState } from '@/components/brand/misc';
import { TrophyMark } from '@/components/brand/Logo';

const REMEMBER_KEY = 'hh-family-code';

export default function ChildLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const remembered = React.useMemo(() => {
    try {
      return localStorage.getItem(REMEMBER_KEY) ?? '';
    } catch {
      return '';
    }
  }, []);
  const schema = z.object({
    familyCode: z.string().trim().min(6, t('validation.required')),
    username: z.string().trim().min(3, t('validation.required')),
    secret: z.string().min(1, t('validation.required')),
  });
  type Values = z.infer<typeof schema>;
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { familyCode: remembered } });
  const [remember, setRemember] = React.useState(!!remembered);
  const [show, setShow] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      await childSignIn(v.familyCode, v.username, v.secret);
      try {
        if (remember) localStorage.setItem(REMEMBER_KEY, v.familyCode.toUpperCase());
        else localStorage.removeItem(REMEMBER_KEY);
      } catch {
        /* ignore */
      }
      navigate('/child', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8 sm:py-12">
      <div className="surface relative overflow-hidden rounded-[var(--radius-hero)] p-6 shadow-[var(--shadow-lift)] sm:p-8">
        <div className="pointer-events-none absolute -top-16 -end-16 size-48 rounded-full bg-gold-300/40 blur-2xl" aria-hidden />
        <TrophyMark className="size-16" />
        <h1 className="mt-3 font-display text-4xl text-plum-600 dark:text-plum-200">{t('auth.childTitle')}</h1>
        <p className="mt-1 text-muted">{t('auth.childSubtitle')}</p>
        <form onSubmit={onSubmit} className="mt-6 grid gap-4" noValidate>
          {error && <ErrorState message={error} />}
          <Field label={t('auth.familyCode')} htmlFor="familyCode" error={formState.errors.familyCode?.message}>
            <Input
              id="familyCode"
              dir="ltr"
              autoCapitalize="characters"
              autoComplete="off"
              className="h-13 text-center font-semibold tracking-[0.3em] uppercase"
              {...register('familyCode')}
            />
          </Field>
          <Field label={t('auth.username')} htmlFor="username" error={formState.errors.username?.message}>
            <Input id="username" dir="ltr" autoCapitalize="none" autoComplete="username" className="h-13 text-lg" {...register('username')} />
          </Field>
          <Field label={t('auth.secret')} htmlFor="secret" error={formState.errors.secret?.message}>
            <div className="relative">
              <Input id="secret" type={show ? 'text' : 'password'} autoComplete="current-password" className="h-13 pe-12 text-lg" {...register('secret')} />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute inset-y-0 end-0 grid w-12 place-items-center text-muted"
                aria-label={t('auth.secret')}
                aria-pressed={show}
              >
                {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
            {t('auth.rememberFamily')}
          </label>
          <Button type="submit" size="xl" variant="gold" loading={formState.isSubmitting}>
            {t('auth.childCta')} ⭐
          </Button>
          <p className="text-center text-sm text-muted">{t('auth.childHelp')}</p>
        </form>
      </div>
    </div>
  );
}
