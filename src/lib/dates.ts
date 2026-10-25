/** Date helpers. All "calendar" dates are ISO yyyy-mm-dd strings in the family's timezone. */

export function todayIn(timeZone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

export function dayOfWeek(iso: string): number {
  return parseISODate(iso).getUTCDay();
}

/** Mirrors private.week_start_for in SQL. */
export function weekStartFor(iso: string, weekStartDay: number): string {
  const dow = dayOfWeek(iso);
  return addDays(iso, -((dow - weekStartDay + 7) % 7));
}

export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function monthRange(iso: string): { from: string; to: string } {
  const d = parseISODate(iso);
  const from = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const to = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return { from: toISODate(from), to: toISODate(to) };
}

export function formatDate(iso: string, locale: string, opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }) {
  const d = parseISODate(String(iso ?? '').slice(0, 10));
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-AE' : 'en-GB', { ...opts, timeZone: 'UTC' }).format(d);
}

export function formatDateTime(ts: string, locale: string, timeZone: string) {
  if (!ts || Number.isNaN(new Date(ts).getTime())) return '—';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-AE' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(ts));
}

export function weekdayName(dow: number, locale: string, style: 'long' | 'short' = 'long') {
  // 2023-01-01 was a Sunday
  return formatDate(addDays('2023-01-01', dow), locale, { weekday: style });
}

export function formatNumber(n: number | null | undefined, locale: string, maxFraction = 0) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-AE' : 'en-GB', { maximumFractionDigits: maxFraction }).format(n);
}

export function formatMoney(n: number | null | undefined, currency: string, locale: string) {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-AE' : 'en-GB', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
}
