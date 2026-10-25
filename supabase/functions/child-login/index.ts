/**
 * POST /functions/v1/child-login
 * Body: { familyCode, username, secret }
 *
 * Children sign in without an email. This function:
 *  1. throttles attempts per account and per IP (before touching Auth),
 *  2. resolves the private login mapping with the service role,
 *  3. derives the account password from the secret + server pepper,
 *  4. signs in through Supabase Auth and returns the session tokens.
 * Errors are deliberately generic so usernames cannot be enumerated.
 */
import { clientIp, handler, HttpError, json, readJson } from '../_shared/http.ts';
import { adminClient, pepper, publicClient } from '../_shared/supabase.ts';
import { deriveChildPassword, normalizeFamilyCode, normalizeUsername } from '../_shared/credentials.ts';

type Body = { familyCode?: string; username?: string; secret?: string };

Deno.serve(
  handler(async (req) => {
    const body = await readJson<Body>(req);
    const familyCode = normalizeFamilyCode(String(body.familyCode ?? ''));
    const username = normalizeUsername(String(body.username ?? ''));
    const secret = String(body.secret ?? '');
    if (!/^[A-Z2-9]{6,10}$/.test(familyCode) || !/^[a-z0-9_.-]{3,24}$/.test(username) || secret.length < 1 || secret.length > 64) {
      throw new HttpError(400, 'invalid_credentials_format');
    }

    const admin = adminClient();
    const ip = clientIp(req);
    const key = `child:${familyCode}:${username}`;

    const { data: blocked, error: blockErr } = await admin.rpc('svc_login_blocked', { p_key: key, p_ip: ip });
    if (blockErr) throw blockErr;
    if (blocked) return json({ error: 'too_many_attempts', retryAfterSeconds: 900 }, 429);

    const fail = async () => {
      await admin.rpc('svc_record_login', { p_key: key, p_ip: ip, p_success: false });
      // small constant delay blunts timing differences between failure causes
      await new Promise((r) => setTimeout(r, 300));
      return json({ error: 'invalid_credentials' }, 401);
    };

    const { data: rows, error } = await admin.rpc('svc_resolve_child_login', {
      p_family_code: familyCode,
      p_username: username,
    });
    if (error) throw error;
    const account = (rows as Array<{ child_id: string; internal_email: string; is_active: boolean }>)?.[0];
    if (!account) return fail();
    if (!account.is_active) {
      await admin.rpc('svc_record_login', { p_key: key, p_ip: ip, p_success: false });
      return json({ error: 'account_inactive' }, 403);
    }

    const password = await deriveChildPassword(pepper(), account.child_id, secret);
    const { data: auth, error: signInError } = await publicClient().auth.signInWithPassword({
      email: account.internal_email,
      password,
    });
    if (signInError || !auth.session) return fail();

    await admin.rpc('svc_record_login', { p_key: key, p_ip: ip, p_success: true });
    return json({
      session: {
        access_token: auth.session.access_token,
        refresh_token: auth.session.refresh_token,
        expires_at: auth.session.expires_at,
      },
    });
  }),
);
