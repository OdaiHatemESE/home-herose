import { describe, expect, it } from 'vitest';
import { dayMaximum, levelFor, nextLevel, percentOf, starBreakdown, taskPoints } from './scoring';

const levels = [
  { code: 'gold', min_percent: 90, rank: 4, is_active: true },
  { code: 'silver', min_percent: 75, rank: 3, is_active: true },
  { code: 'bronze', min_percent: 60, rank: 2, is_active: true },
  { code: 'growing', min_percent: 0, rank: 1, is_active: true },
];

describe('scoring helpers (mirror the server rules for display)', () => {
  it('awards +2 independent and +1 after a reminder by default', () => {
    expect(taskPoints(1, 1, 'independent')).toBe(2);
    expect(taskPoints(1, 1, 'reminded')).toBe(1);
  });

  it('computes the default seven-task day maximum of 16', () => {
    const seven = Array.from({ length: 7 }, () => ({ base_points: 1, independence_bonus: 1 }));
    expect(dayMaximum(seven, 2)).toBe(16);
    expect(dayMaximum([], 2)).toBe(0); // no eligible tasks → no initiative allowance either
  });

  it('calculates the weekly percentage and caps it at 100', () => {
    expect(percentOf(13, 14)).toBe(92.86);
    expect(percentOf(20, 14)).toBe(100);
    expect(percentOf(-3, 14)).toBe(0);
    expect(percentOf(5, 0)).toBeNull();
  });

  it('picks levels at the documented boundaries', () => {
    expect(levelFor(100, levels)?.code).toBe('gold');
    expect(levelFor(90, levels)?.code).toBe('gold');
    expect(levelFor(89.99, levels)?.code).toBe('silver');
    expect(levelFor(75, levels)?.code).toBe('silver');
    expect(levelFor(74.9, levels)?.code).toBe('bronze');
    expect(levelFor(60, levels)?.code).toBe('bronze');
    expect(levelFor(59, levels)?.code).toBe('growing');
    expect(levelFor(null, levels)?.code).toBe('growing');
  });

  it('ignores inactive levels and reports the next goal', () => {
    const custom = levels.map((l) => (l.code === 'silver' ? { ...l, is_active: false } : l));
    expect(levelFor(80, custom)?.code).toBe('bronze');
    expect(nextLevel(80, levels)?.level.code).toBe('gold');
    expect(nextLevel(80, levels)?.missing).toBe(10);
    expect(nextLevel(95, levels)).toBeNull();
  });

  it('separates golden initiative stars from task stars', () => {
    expect(starBreakdown(15, 2)).toEqual({ regular: 13, golden: 2 });
  });
});
