import { describe, expect, it } from 'vitest';
import { addDays, dayOfWeek, formatDate, monthRange, todayIn, weekDates, weekStartFor } from './dates';

describe('date helpers', () => {
  it('finds the family week start exactly like private.week_start_for', () => {
    // 2026-10-25 is a Sunday
    expect(dayOfWeek('2026-10-25')).toBe(0);
    expect(weekStartFor('2026-10-25', 1)).toBe('2026-10-19'); // Monday weeks
    expect(weekStartFor('2026-10-25', 0)).toBe('2026-10-25'); // Sunday weeks
    expect(weekStartFor('2026-10-24', 6)).toBe('2026-10-24'); // Saturday weeks
    expect(weekDates('2026-10-19')).toHaveLength(7);
    expect(weekDates('2026-10-19')[6]).toBe('2026-10-25');
  });

  it('resolves "today" in the family timezone, not the browser timezone', () => {
    const lateUtc = new Date('2026-10-25T22:30:00Z');
    expect(todayIn('Asia/Dubai', lateUtc)).toBe('2026-10-26');
    expect(todayIn('America/New_York', lateUtc)).toBe('2026-10-25');
  });

  it('handles month boundaries and leap years', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(monthRange('2026-02-10')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });

  it('never throws on malformed dates', () => {
    expect(formatDate('not-a-date', 'ar')).toBe('—');
    expect(formatDate('2026-10-25T00:00:00.000Z', 'en', { day: 'numeric', month: 'short' })).toBe('25 Oct');
  });
});
