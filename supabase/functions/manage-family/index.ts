/**
 * POST /functions/v1/manage-family   (Authorization: Bearer <parent access token>)
 * Actions:
 *  - delete_family     { familyId, confirmName }  owner only — removes all data and child accounts
 *  - delete_my_account {}                          removes the caller's account (not allowed while owning a family)
 */
import { handler, HttpError, json, readJson } from '../_shared/http.ts';
import { adminClient, requireParent, requireUser } from '../_shared/supabase.ts';

type Body = { action?: 'delete_family' | 'delete_my_account'; familyId?: string; confirmName?: string };

Deno.serve(
  handler(async (req) => {
    const admin = adminClient();
    const user = await requireUser(req, admin);
    const body = await readJson<Body>(req);

    const { data: allowed } = await admin.rpc('svc_rate_limit', {
      p_key: `manage-family:${user.id}`,
      p_max: 10,
      p_window_seconds: 900,
    });
    if (!allowed) throw new HttpError(429, 'too_many_requests');

    if (body.action === 'delete_family') {
      if (!body.familyId) throw new HttpError(400, 'invalid_family');
      await requireParent(admin, user.id, body.familyId, { owner: true });
      const { data: family, error } = await admin.from('families').select('name').eq('id', body.familyId).single();
      if (error) throw error;
      if ((body.confirmName ?? '').trim() !== family.name) throw new HttpError(400, 'confirmation_mismatch');

      const { data: kids, error: kidsErr } = await admin
        .from('children')
        .select('auth_user_id')
        .eq('family_id', body.familyId);
      if (kidsErr) throw kidsErr;
      const { error: purgeErr } = await admin.rpc('svc_purge_family', { p_family: body.familyId });
      if (purgeErr) throw purgeErr;
      for (const k of kids ?? []) {
        if (k.auth_user_id) await admin.auth.admin.deleteUser(k.auth_user_id);
      }
      return json({ ok: true });
    }

    if (body.action === 'delete_my_account') {
      const { data: owned } = await admin.from('family_members').select('id').eq('user_id', user.id).eq('role', 'owner');
      if (owned && owned.length > 0) throw new HttpError(409, 'delete_family_first');
      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error) throw error;
      return json({ ok: true });
    }

    throw new HttpError(400, 'invalid_action');
  }),
);
