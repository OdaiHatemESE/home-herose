import { describe, expect, it } from 'vitest';
import { secretProblem, suggestSecret, suggestUsername } from './secrets';
import { validateChildSecret } from '../../supabase/functions/_shared/credentials';

describe('child secrets', () => {
  it('suggests memorable secrets that pass the server rules', () => {
    for (let i = 0; i < 50; i++) {
      const ar = suggestSecret('ar');
      const en = suggestSecret('en');
      expect(secretProblem(ar)).toBeNull();
      expect(validateChildSecret(en)).toBeNull();
    }
  });

  it('client-side checks agree with the Edge Function', () => {
    for (const s of ['1234', '123456', 'aaaaaa', 'abcdef', 'نجمة-٢', 'lion-blue-7', 'password', '  short ']) {
      expect(secretProblem(s)).toBe(validateChildSecret(s));
    }
  });

  it('transliterates Arabic names into valid usernames', () => {
    expect(suggestUsername('حاتم', [])).toBe('hatm');
    expect(suggestUsername('حاتم', ['hatm'])).toBe('hatm2');
    expect(suggestUsername('أُبي', [])).toMatch(/^[a-z0-9]{3,24}$/);
  });
});
