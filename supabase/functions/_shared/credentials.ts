/**
 * Child credentials.
 *
 * A child never has an email. Their Supabase Auth account uses a private internal
 * email and a password DERIVED from the child's secret with a server-side pepper:
 *
 *   password = base64url(HMAC-SHA256(CHILD_CREDENTIAL_PEPPER, childId + ":" + normalizedSecret))
 *
 * Knowing the child's secret alone is not enough to sign in directly against
 * Supabase Auth — the pepper lives only in Edge Function secrets. Brute force is
 * throttled by the child-login function before Auth is ever called.
 *
 * This file is runtime-agnostic (Web Crypto) so it is shared by Deno and Vitest.
 */

export const CHILD_EMAIL_DOMAIN_DEFAULT = 'children.home-heroes.invalid';

export function normalizeSecret(secret: string): string {
  return secret.normalize('NFKC').trim();
}

export function normalizeUsername(username: string): string {
  return username.normalize('NFKC').trim().toLowerCase();
}

export function normalizeFamilyCode(code: string): string {
  return code.replace(/[\s-]/g, '').toUpperCase();
}

export function internalChildEmail(childId: string, domain = CHILD_EMAIL_DOMAIN_DEFAULT): string {
  return `child-${childId}@${domain}`;
}

const SEQUENCES = ['0123456789', '9876543210', 'abcdefghijklmnopqrstuvwxyz', 'qwertyuiop', 'asdfghjkl'];

/** Returns an error code, or null when the secret is acceptable. */
export function validateChildSecret(secret: string): string | null {
  const s = normalizeSecret(secret);
  if (s.length < 6) return 'secret_too_short';
  if (s.length > 64) return 'secret_too_long';
  if (/^(.)\1+$/u.test(s)) return 'secret_too_simple';
  const lower = s.toLowerCase();
  if (SEQUENCES.some((seq) => seq.includes(lower))) return 'secret_too_simple';
  if (['password', '123456', '654321', '111111', '000000', '121212'].includes(lower)) return 'secret_too_simple';
  return null;
}

function toBase64Url(bytes: ArrayBuffer): string {
  let bin = '';
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function deriveChildPassword(pepper: string, childId: string, secret: string): Promise<string> {
  if (!pepper || pepper.length < 32) throw new Error('CHILD_CREDENTIAL_PEPPER must be at least 32 characters');
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(pepper), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${childId}:${normalizeSecret(secret)}`));
  return toBase64Url(sig);
}
