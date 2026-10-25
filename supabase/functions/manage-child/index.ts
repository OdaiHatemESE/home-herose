/**
 * POST /functions/v1/manage-child   (Authorization: Bearer <parent access token>)
 * Actions: create | reset_secret | deactivate | reactivate | delete
 *
 * Every action re-validates that the caller is a parent of the child's family.
 */
import { clientIp, handler, HttpError, json, readJson } from '../_shared/http.ts';
import { adminClient, childEmailDomain, pepper, requireParent, requireUser } from '../_shared/supabase.ts';
import { deriveChildPassword, internalChildEmail, normalizeUsername, validateChildSecret } from '../_shared/credentials.ts';

type Body = {
  action?: 'create' | 'reset_secret' | 'deactivate' | 'reactivate' | 'delete';
  familyId?: string;
  childId?: string;
  displayName?: string;
  username?: string;
  birthYear?: number | null;
  avatar?: string;
  color?: string;
  uiMode?: 'standard' | 'simple';
  householdResponsibility?: string | null;
  secret?: string;
  confirmName?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BAN_FOREVER = '876000h';

Deno.serve(
  handler(async (req) => {
    const admin = adminClient();
    const user = await requireUser(req, admin);
    const body = await readJson<Body>(req);

    const { data: allowed } = await admin.rpc('svc_rate_limit', {
      p_key: `manage-child:${user.id}`,
      p_max: 40,
      p_window_seconds: 900,
    });
    if (!allowed) throw new HttpError(429, 'too_many_requests');

    if (body.action === 'create') {
      if (!body.familyId || !UUID.test(body.familyId)) throw new HttpError(400, 'invalid_family');
      await requireParent(admin, user.id, body.familyId);
      const username = normalizeUsername(body.username ?? '');
      const displayName = (body.displayName ?? '').trim();
      if (!/^[a-z0-9_.-]{3,24}$/.test(username)) throw new HttpError(400, 'invalid_username');
      if (displayName.length < 1 || displayName.length > 40) throw new HttpError(400, 'invalid_name');
      const secretError = validateChildSecret(body.secret ?? '');
      if (secretError) throw new HttpError(400, secretError);

      const { data: child, error: insertError } = await admin
        .from('children')
        .insert({
          family_id: body.familyId,
          display_name: displayName,
          username,
          birth_year: body.birthYear ?? null,
          avatar: body.avatar ?? 'star',
          color: body.color ?? 'gold',
          ui_mode: body.uiMode ?? 'standard',
          household_responsibility: body.householdResponsibility ?? null,
        })
        .select('id')
        .single();
      if (insertError) {
        if (insertError.code === '23505') throw new HttpError(409, 'username_taken');
        throw insertError;
      }

      const email = internalChildEmail(child.id, childEmailDomain());
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password: await deriveChildPassword(pepper(), child.id, body.secret!),
        email_confirm: true,
        app_metadata: { role: 'child', family_id: body.familyId, child_id: child.id },
        user_metadata: { display_name: displayName },
      });
      if (createError || !created.user) {
        await admin.from('children').delete().eq('id', child.id);
        throw createError ?? new Error('create_user_failed');
      }
      const { error: mapError } = await admin.rpc('svc_register_child_auth', {
        p_child: child.id,
        p_user: created.user.id,
        p_email: email,
      });
      if (mapError) {
        await admin.auth.admin.deleteUser(created.user.id);
        await admin.from('children').delete().eq('id', child.id);
        throw mapError;
      }
      return json({ childId: child.id }, 201);
    }

    // all other actions target an existing child
    if (!body.childId || !UUID.test(body.childId)) throw new HttpError(400, 'invalid_child');
    const { data: child, error: childError } = await admin
      .from('children')
      .select('id, family_id, display_name, auth_user_id')
      .eq('id', body.childId)
      .maybeSingle();
    if (childError) throw childError;
    if (!child) throw new HttpError(404, 'not_found');
    await requireParent(admin, user.id, child.family_id);

    const authUserId = child.auth_user_id as string | null;

    switch (body.action) {
      case 'reset_secret': {
        const secretError = validateChildSecret(body.secret ?? '');
        if (secretError) throw new HttpError(400, secretError);
        if (!authUserId) throw new HttpError(409, 'no_login_account');
        const { error } = await admin.auth.admin.updateUserById(authUserId, {
          password: await deriveChildPassword(pepper(), child.id, body.secret!),
        });
        if (error) throw error;
        await admin.rpc('svc_bump_credential', { p_child: child.id });
        await admin.rpc('svc_revoke_sessions', { p_user: authUserId });
        console.log(JSON.stringify({ event: 'child_secret_reset', child: child.id, by: user.id, ip: clientIp(req) }));
        return json({ ok: true });
      }
      case 'deactivate':
      case 'reactivate': {
        const active = body.action === 'reactivate';
        if (authUserId) {
          const { error } = await admin.auth.admin.updateUserById(authUserId, {
            ban_duration: active ? 'none' : BAN_FOREVER,
          });
          if (error) throw error;
          if (!active) await admin.rpc('svc_revoke_sessions', { p_user: authUserId });
        }
        const { error } = await admin.from('children').update({ is_active: active }).eq('id', child.id);
        if (error) throw error;
        return json({ ok: true, isActive: active });
      }
      case 'delete': {
        if ((body.confirmName ?? '').trim() !== child.display_name) throw new HttpError(400, 'confirmation_mismatch');
        // the child's history is removed with the child (cascade)
        const { error: rpcErr } = await admin.rpc('svc_delete_child', { p_child: child.id });
        if (rpcErr) throw rpcErr;
        if (authUserId) await admin.auth.admin.deleteUser(authUserId);
        return json({ ok: true });
      }
      default:
        throw new HttpError(400, 'invalid_action');
    }
  }),
);
