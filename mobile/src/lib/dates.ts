/**
 * The website's date helpers, with app-specific formatting: Arabic text keeps Western digits
 * (as used in the UAE). Phones otherwise print ٠١٢…, where ٠ looks like a dot.
 */
import { addDays, parseISODate } from '@shared/lib/dates';

export { addDays, dayOfWeek, monthRange, parseISODate, toISODate, weekDates, weekStartFor } from '@shared/lib/dates';

const loc = (locale: string) => (locale === 'ar' ? 'ar-AE-u-nu-latn' : 'en-GB');

export function formatDate(iso: string, locale: string, opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }) {
  const d = parseISODate(String(iso ?? '').slice(0, 10));
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(loc(locale), { ...opts, timeZone: 'UTC' }).format(d);
}

export function weekdayName(dow: number, locale: string, style: 'long' | 'short' = 'long') {
  return formatDate(addDays('2023-01-01', dow), locale, { weekday: style });
}

export function formatNumber(n: number | null | undefined, locale: string, maxFraction = 0) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat(loc(locale), { maximumFractionDigits: maxFraction }).format(n);
}

export function formatMoney(n: number | null | undefined, currency: string, locale: string) {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat(loc(locale), { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
}
