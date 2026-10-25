/**
 * Client-side mirror of display-only scoring helpers.
 * Points are NEVER calculated here for persistence — the database is the source of truth.
 * These helpers only explain the rules to families (previews, labels, progress bars).
 */
import type { AchievementLevel, CompletionMode } from './database.types';

export function taskPoints(base: number, bonus: number, mode: CompletionMode) {
  return base + (mode === 'independent' ? bonus : 0);
}

export function dayMaximum(tasks: { base_points: number; independence_bonus: number }[], initiativeCap: number) {
  if (tasks.length === 0) return 0;
  return tasks.reduce((s, t) => s + t.base_points + t.independence_bonus, 0) + initiativeCap;
}

export function percentOf(approved: number, max: number): number | null {
  if (max <= 0) return null;
  return Math.min(100, Math.round((Math.max(approved, 0) * 10000) / max) / 100);
}

/** Highest active level whose threshold is met (same rule as private.level_for). */
export function levelFor(percent: number | null, levels: Pick<AchievementLevel, 'min_percent' | 'rank' | 'is_active'>[]) {
  const p = percent ?? 0;
  return (
    [...levels]
      .filter((l) => l.is_active && p >= Number(l.min_percent))
      .sort((a, b) => Number(b.min_percent) - Number(a.min_percent) || b.rank - a.rank)[0] ?? null
  );
}

/** Next level up and the percentage still needed to reach it. */
export function nextLevel<T extends Pick<AchievementLevel, 'min_percent' | 'rank' | 'is_active'>>(percent: number | null, levels: T[]) {
  const p = percent ?? 0;
  const next = [...levels]
    .filter((l) => l.is_active && Number(l.min_percent) > p)
    .sort((a, b) => Number(a.min_percent) - Number(b.min_percent))[0];
  return next ? { level: next, missing: Math.round((Number(next.min_percent) - p) * 10) / 10 } : null;
}

/** Stars shown to children: 1 star per approved point. Golden stars mark initiative points. */
export function starBreakdown(approved: number, initiativePoints: number) {
  return { regular: Math.max(0, approved - initiativePoints), golden: Math.max(0, initiativePoints) };
}
