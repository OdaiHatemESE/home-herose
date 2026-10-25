import { describe, expect, it } from 'vitest';
import {
  deriveChildPassword,
  internalChildEmail,
  normalizeFamilyCode,
  normalizeUsername,
  validateChildSecret,
} from '../functions/_shared/credentials';

const PEPPER = 'x'.repeat(48);
const CHILD = '2f8b1c3e-4d5a-4b6c-8d7e-9f0a1b2c3d4e';

describe('child credentials', () => {
  it('derives a stable, high-entropy password that depends on pepper, child and secret', async () => {
    const a = await deriveChildPassword(PEPPER, CHILD, 'نجمة-٢٠٢٦');
    expect(a).toBe(await deriveChildPassword(PEPPER, CHILD, '  نجمة-٢٠٢٦ '));
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(await deriveChildPassword(PEPPER, CHILD, 'نجمة-٢٠٢٧'));
    expect(a).not.toBe(await deriveChildPassword('y'.repeat(48), CHILD, 'نجمة-٢٠٢٦'));
    expect(a).not.toBe(await deriveChildPassword(PEPPER, CHILD.replace('2f', '3f'), 'نجمة-٢٠٢٦'));
  });

  it('refuses a weak pepper', async () => {
    await expect(deriveChildPassword('short', CHILD, 'secret1')).rejects.toThrow(/PEPPER/);
  });

  it('rejects insecure child secrets, including bare 4-digit PINs', () => {
    expect(validateChildSecret('1234')).toBe('secret_too_short');
    expect(validateChildSecret('123456')).toBe('secret_too_simple');
    expect(validateChildSecret('aaaaaaa')).toBe('secret_too_simple');
    expect(validateChildSecret('abcdef')).toBe('secret_too_simple');
    expect(validateChildSecret('قطة-زرقاء')).toBeNull();
    expect(validateChildSecret('lion-blue-7')).toBeNull();
  });

  it('normalizes identifiers', () => {
    expect(normalizeUsername('  Hatem ')).toBe('hatem');
    expect(normalizeFamilyCode('abcd-efgh')).toBe('ABCDEFGH');
    expect(internalChildEmail(CHILD)).toBe(`child-${CHILD}@children.home-heroes.invalid`);
  });
});
