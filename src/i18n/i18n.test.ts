import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import ar from './ar';
import en from './en';
import i18n, { pick, setLanguage } from './index';

function flatten(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? flatten(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return /\.(tsx?|ts)$/.test(f) && !f.endsWith('.test.ts') && !f.endsWith('.test.tsx') ? [p] : [];
  });
}

const PLURAL = /_(zero|one|two|few|many|other)$/;

describe('translations', () => {
  const arKeys = new Set(flatten(ar));
  const enKeys = new Set(flatten(en));

  it('Arabic and English have exactly the same keys', () => {
    expect([...arKeys].filter((k) => !enKeys.has(k))).toEqual([]);
    expect([...enKeys].filter((k) => !arKeys.has(k))).toEqual([]);
  });

  it('every literal t("…") key used in the app exists', () => {
    const root = join(__dirname, '..');
    const used = new Set<string>();
    for (const file of sourceFiles(root)) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) used.add(m[1]);
    }
    const bases = new Set([...arKeys].map((k) => k.replace(PLURAL, '')));
    const missing = [...used].filter((k) => !arKeys.has(k) && !bases.has(k) && ![...arKeys].some((a) => a.startsWith(`${k}.`)));
    expect(missing).toEqual([]);
    expect(used.size).toBeGreaterThan(300);
  });

  it('switches document direction with the language', () => {
    setLanguage('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(i18n.t('common.save')).toBe('Save');
    setLanguage('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
    expect(i18n.t('common.save')).toBe('حفظ');
  });

  it('uses Arabic plural forms', () => {
    expect(i18n.t('common.pointsCount', { count: 2 })).toBe('نقطتان');
    expect(i18n.t('common.pointsCount', { count: 1 })).toBe('نقطة واحدة');
    expect(i18n.t('common.pointsCount', { count: 5 })).toBe('5 نقاط');
  });

  it('picks the bilingual database field for the active language with fallback', () => {
    expect(pick('ar', 'الصلوات', 'Prayers')).toBe('الصلوات');
    expect(pick('en', 'الصلوات', 'Prayers')).toBe('Prayers');
    expect(pick('en', 'الصلوات', '')).toBe('الصلوات');
  });
});
