import i18n from '@/i18n';

/** Maps database / Edge Function error codes to friendly, actionable messages. */
export function errorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message) : String(err);
  const code = raw.split(':')[0].trim();
  const key = `errors.${code}`;
  if (i18n.exists(key)) {
    const reason = raw.split(':')[1]?.trim();
    return i18n.t(key, { reason: reason ? i18n.t(`errors.reason_${reason}`, { defaultValue: reason }) : '' });
  }
  if (/duplicate key/.test(raw)) return i18n.t('errors.duplicate');
  if (/row-level security|permission denied/.test(raw)) return i18n.t('errors.forbidden');
  if (/Failed to fetch|NetworkError/.test(raw)) return i18n.t('errors.network');
  if (/Invalid login credentials/.test(raw)) return i18n.t('errors.invalid_credentials');
  if (/Email not confirmed/.test(raw)) return i18n.t('errors.email_not_confirmed');
  if (/User already registered/.test(raw)) return i18n.t('errors.user_exists');
  return i18n.t('errors.generic');
}
