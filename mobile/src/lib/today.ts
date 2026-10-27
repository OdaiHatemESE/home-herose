import { todayIn as sharedTodayIn } from '@shared/lib/dates';

/**
 * Today's calendar date in the family's timezone. Uses the website's helper, with fallbacks for
 * phone JavaScript engines whose Intl support is partial (formatToParts / timeZone).
 */
export function todayIn(timeZone: string, now = new Date()): string {
  try {
    return sharedTodayIn(timeZone, now);
  } catch {
    /* fall through */
  }
  try {
    const s = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  } catch {
    /* fall through */
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
