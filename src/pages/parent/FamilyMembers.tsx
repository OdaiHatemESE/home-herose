import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { KeyRound, MailPlus, MoreVertical, Pause, Pencil, Play, PlusCircle, RefreshCw, Trash2, UserMinus, UserPlus } from 'lucide-react';
import { useAuth, useParent } from '@/auth/AuthProvider';
import { childAccountApi, familyApi, privacyApi, useChildren, useInvitations, useMembers, useUpdateChild } from '@/api/family';
import { useFamilyTable } from '@/api/content';
import { useAction } from '@/api/core';
import { errorMessage } from '@/lib/errors';
import { AVATAR_KEYS, avatarEmoji, COLOR_KEYS } from '@/lib/icons';
import { secretProblem, suggestSecret, suggestUsername } from '@/lib/secrets';
import { ageFromBirthYear, cn } from '@/lib/utils';
import { formatDate } from '@/lib/dates';
import type { Child } from '@/lib/database.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Field } from '@/components/ui/label';
import { Input, Select } from '@/components/ui/input';
import { Skeleton, Switch } from '@/components/ui/controls';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { useConfirm } from '@/components/ui/confirm';
import { ChildAvatar, PageHeader } from '@/components/brand/misc';
import { AdjustPointsDialog } from '@/components/parent/AdjustPointsDialog';
import { InviteLinkBox } from '@/pages/onboarding/Onboarding';

type ChildForm = {
  displayName: string;
  username: string;
  age: string;
  avatar: string;
  color: string;
  uiMode: 'standard' | 'simple';
  responsibility: string;
  secret: string;
};

export default function FamilyMembers() {
  const { t, i18n } = useTranslation();
  const { familyId, family, membership, today } = useParent();
  const { session } = useAuth();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const children = useChildren(familyId, { includeInactive: true });
  const members = useMembers(familyId);
  const invitations = useInvitations(familyId);
  const skills = useFamilyTable('skills', familyId, 'sort_order');
  const [editing, setEditing] = React.useState<Child | 'new' | null>(null);
  const [resetFor, setResetFor] = React.useState<Child | null>(null);
  const [adjustFor, setAdjustFor] = React.useState<Child | null>(null);
  const [inviteOpen, setInviteOpen] = React.useState(false);

  const refresh = () => qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'identity' });
  const accountAction = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => void refresh(),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const removeMember = useAction(privacyApi.removeMember, { success: t('common.deleted') });
  const revoke = useAction(privacyApi.revokeInvitation, { success: t('family.revoked') });
  const isOwner = membership.role === 'owner';

  return (
    <>
      <PageHeader
        title={t('family.title')}
        description={t('family.description')}
        actions={
          <>
            <Button onClick={() => setEditing('new')}><UserPlus /> {t('family.addChild')}</Button>
            <Button variant="outline" onClick={() => setInviteOpen(true)}><MailPlus /> {t('family.invite')}</Button>
          </>
        }
      />

      <section aria-labelledby="heroes" className="mb-8">
        <h2 id="heroes" className="mb-3 text-lg font-semibold">{t('family.childrenTitle')}</h2>
        {children.isPending ? (
          <Skeleton className="h-32" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {(children.data ?? []).map((c) => (
              <article key={c.id} className={cn('surface rounded-[var(--radius-card)] p-4 shadow-[var(--shadow-soft)]', !c.is_active && 'opacity-60')}>
                <div className="flex items-start gap-3">
                  <ChildAvatar avatar={c.avatar} color={c.color} size="lg" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold">{c.display_name}</h3>
                    <p className="text-sm text-muted">
                      {ageFromBirthYear(c.birth_year) !== null && `${ageFromBirthYear(c.birth_year)} — `}
                      <span dir="ltr">@{c.username}</span>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {c.ui_mode === 'simple' && <Badge tone="gold">{t('onboarding.simpleMode')}</Badge>}
                      {!c.is_active && <Badge tone="red">{t('family.deactivated')}</Badge>}
                      {!c.auth_user_id && <Badge>{t('family.noLogin')}</Badge>}
                    </div>
                    {c.household_responsibility && <p className="mt-2 text-sm">{c.household_responsibility}</p>}
                  </div>
                  <Menu>
                    <MenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={t('common.actions')}><MoreVertical /></Button>
                    </MenuTrigger>
                    <MenuContent align="end">
                      <MenuItem onSelect={() => setEditing(c)}><Pencil /> {t('common.edit')}</MenuItem>
                      <MenuItem onSelect={() => setResetFor(c)}><KeyRound /> {t('family.resetSecret')}</MenuItem>
                      <MenuItem onSelect={() => setAdjustFor(c)}><PlusCircle /> {t('points.adjust')}</MenuItem>
                      <MenuItem
                        onSelect={() =>
                          accountAction.mutate(async () => {
                            await childAccountApi.setActive(c.id, !c.is_active);
                            toast.success(c.is_active ? t('family.deactivated') : t('common.active'));
                          })
                        }
                      >
                        {c.is_active ? <><Pause /> {t('family.deactivate')}</> : <><Play /> {t('family.reactivate')}</>}
                      </MenuItem>
                      <MenuSeparator />
                      <MenuItem
                        className="text-red-600"
                        onSelect={async () => {
                          const ok = await confirm({
                            title: t('family.deleteChild'),
                            description: t('family.deleteChildBody', { name: c.display_name }),
                            tone: 'danger',
                            typeToConfirm: c.display_name,
                            confirmLabel: t('common.delete'),
                          });
                          if (ok) accountAction.mutate(async () => { await childAccountApi.remove(c.id, c.display_name); toast.success(t('common.deleted')); });
                        }}
                      >
                        <Trash2 /> {t('family.deleteChild')}
                      </MenuItem>
                    </MenuContent>
                  </Menu>
                </div>
                <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm">
                  <span className="font-medium">{t('family.loginCard')}: </span>
                  <span>{t('family.loginCardHint', { code: family.family_code, username: c.username })}</span>
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t('family.parentsTitle')}</CardTitle></CardHeader>
          <CardContent>
            <ul className="grid gap-2">
              {(members.data ?? []).map((m) => {
                const me = m.user_id === session?.user.id;
                return (
                  <li key={m.id} className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2">
                    <span className="flex-1">
                      <span className="font-medium">{m.display_name ?? m.profile?.display_name ?? '—'}</span> {me && <span className="text-sm text-muted">{t('family.you')}</span>}
                    </span>
                    <Badge tone={m.role === 'owner' ? 'gold' : 'purple'}>{m.role === 'owner' ? t('family.owner') : t('family.coParent')}</Badge>
                    {m.role !== 'owner' && (isOwner || me) && (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={me ? t('family.leave') : t('family.remove')}
                        onClick={async () => {
                          if (await confirm({ title: me ? t('family.leave') : t('family.remove'), description: t('family.removeConfirm', { name: m.display_name ?? m.profile?.display_name ?? '' }), tone: 'danger' })) {
                            removeMember.mutate(m.id);
                          }
                        }}
                      >
                        <UserMinus />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t('family.invitations')}</CardTitle></CardHeader>
          <CardContent>
            {!invitations.data?.length ? (
              <p className="text-sm text-muted">{t('common.none')}</p>
            ) : (
              <ul className="grid gap-2">
                {invitations.data.map((inv) => (
                  <li key={inv.id} className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2 text-sm">
                    <span className="flex-1" dir="ltr">{inv.email ?? '—'}</span>
                    <span className="text-muted">{t('family.expires', { date: formatDate(inv.expires_at.slice(0, 10), i18n.language, { day: 'numeric', month: 'short' }) })}</span>
                    <Button size="sm" variant="ghost" onClick={() => revoke.mutate(inv.id)}>{t('family.revoke')}</Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ChildDialog
        target={editing}
        onClose={() => setEditing(null)}
        familyId={familyId}
        takenUsernames={(children.data ?? []).map((c) => c.username)}
        onSaved={() => void refresh()}
      />
      <ResetSecretDialog child={resetFor} onClose={() => setResetFor(null)} />
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} familyId={familyId} />
      <AdjustPointsDialog open={!!adjustFor} onOpenChange={(o) => !o && setAdjustFor(null)} child={adjustFor} skills={skills.data ?? []} today={today} />
    </>
  );
}

function ChildDialog({ target, onClose, familyId, takenUsernames, onSaved }: {
  target: Child | 'new' | null;
  onClose: () => void;
  familyId: string;
  takenUsernames: string[];
  onSaved: () => void;
}) {
  const { t, i18n } = useTranslation();
  const isNew = target === 'new';
  const [form, setForm] = React.useState<ChildForm | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const update = useUpdateChild();
  const create = useMutation({
    mutationFn: familyApi.createChild,
    onSuccess: (_r, v) => {
      toast.success(t('family.created', { name: v.displayName }));
      onSaved();
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  React.useEffect(() => {
    setError(null);
    if (target === 'new') {
      setForm({ displayName: '', username: '', age: '', avatar: AVATAR_KEYS[0], color: 'purple', uiMode: 'standard', responsibility: '', secret: suggestSecret(i18n.language) });
    } else if (target) {
      setForm({
        displayName: target.display_name,
        username: target.username,
        age: String(ageFromBirthYear(target.birth_year) ?? ''),
        avatar: target.avatar,
        color: target.color,
        uiMode: target.ui_mode,
        responsibility: target.household_responsibility ?? '',
        secret: '',
      });
    } else setForm(null);
  }, [target, i18n.language]);

  if (!form) return null;
  const set = (p: Partial<ChildForm>) => setForm({ ...form, ...p });
  const birthYear = form.age ? new Date().getFullYear() - Number(form.age) : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isNew) {
      const sp = secretProblem(form.secret);
      if (sp) return setError(t(`errors.${sp}`));
      if (!/^[a-z0-9_.-]{3,24}$/.test(form.username)) return setError(t('errors.invalid_username'));
      create.mutate({
        familyId,
        displayName: form.displayName.trim(),
        username: form.username,
        birthYear,
        avatar: form.avatar,
        color: form.color,
        uiMode: form.uiMode,
        householdResponsibility: form.responsibility.trim() || null,
        secret: form.secret,
      });
    } else if (target && typeof target !== 'string') {
      update.mutate(
        {
          id: target.id,
          display_name: form.displayName.trim(),
          birth_year: birthYear,
          avatar: form.avatar,
          color: form.color,
          ui_mode: form.uiMode,
          household_responsibility: form.responsibility.trim() || null,
        },
        { onSuccess: () => { toast.success(t('common.saved')); onClose(); } },
      );
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent wide title={isNew ? t('family.addChild') : t('family.editChild', { name: (target as Child).display_name })}>
        <form className="grid gap-4 sm:grid-cols-6" onSubmit={submit}>
          {error && <p role="alert" className="text-sm text-red-600 sm:col-span-6">{error}</p>}
          <Field label={t('onboarding.childName')} htmlFor="cd-name" className="sm:col-span-3">
            <Input
              id="cd-name"
              required
              value={form.displayName}
              onChange={(e) => set({ displayName: e.target.value })}
              onBlur={() => isNew && !form.username && form.displayName && set({ username: suggestUsername(form.displayName, takenUsernames) })}
            />
          </Field>
          <Field label={t('onboarding.childAge')} htmlFor="cd-age" className="sm:col-span-1">
            <Input id="cd-age" inputMode="numeric" value={form.age} onChange={(e) => set({ age: e.target.value.replace(/\D/g, '') })} />
          </Field>
          <Field label={t('onboarding.childUsername')} htmlFor="cd-user" className="sm:col-span-2">
            <Input id="cd-user" dir="ltr" value={form.username} disabled={!isNew} onChange={(e) => set({ username: e.target.value.toLowerCase().trim() })} />
          </Field>
          {isNew && (
            <Field label={t('onboarding.childSecret')} htmlFor="cd-secret" hint={t('onboarding.childSecretHint')} className="sm:col-span-6">
              <div className="flex gap-2">
                <Input id="cd-secret" value={form.secret} onChange={(e) => set({ secret: e.target.value })} />
                <Button type="button" variant="outline" size="icon" aria-label={t('family.resetSecret')} onClick={() => set({ secret: suggestSecret(i18n.language) })}>
                  <RefreshCw />
                </Button>
              </div>
            </Field>
          )}
          <Field label={t('onboarding.responsibility')} htmlFor="cd-resp" className="sm:col-span-6">
            <Input id="cd-resp" value={form.responsibility} onChange={(e) => set({ responsibility: e.target.value })} />
          </Field>
          <div className="grid gap-1.5 sm:col-span-6">
            <span className="text-sm font-medium">{t('onboarding.avatar')}</span>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('onboarding.avatar')}>
              {AVATAR_KEYS.map((a) => (
                <button
                  key={a}
                  type="button"
                  role="radio"
                  aria-checked={form.avatar === a}
                  aria-label={a}
                  onClick={() => set({ avatar: a })}
                  className={cn('grid size-10 place-items-center rounded-full text-xl', form.avatar === a ? 'bg-plum-100 ring-2 ring-plum-500 dark:bg-plum-500/30' : 'hover:bg-surface-2')}
                >
                  {avatarEmoji(a)}
                </button>
              ))}
            </div>
          </div>
          <Field label={t('common.color')} htmlFor="cd-color" className="sm:col-span-3">
            <Select id="cd-color" value={form.color} onChange={(e) => set({ color: e.target.value })}>
              {COLOR_KEYS.map((c) => <option key={c} value={c}>{t(`colors.${c}`)}</option>)}
            </Select>
          </Field>
          <label className="flex items-center justify-between gap-3 self-end rounded-[var(--radius-control)] bg-surface-2 px-3 py-2.5 text-sm sm:col-span-3">
            {t('onboarding.simpleMode')}
            <Switch checked={form.uiMode === 'simple'} onCheckedChange={(v) => set({ uiMode: v ? 'simple' : 'standard' })} />
          </label>
          <DialogFooter className="sm:col-span-6">
            <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" loading={create.isPending || update.isPending}>{isNew ? t('common.create') : t('common.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetSecretDialog({ child, onClose }: { child: Child | null; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const [secret, setSecret] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const reset = useMutation({
    mutationFn: (v: { id: string; secret: string }) => childAccountApi.resetSecret(v.id, v.secret),
    onSuccess: () => {
      toast.success(t('family.resetSecretDone'));
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  React.useEffect(() => {
    if (child) {
      setSecret(suggestSecret(i18n.language));
      setError(null);
    }
  }, [child, i18n.language]);
  if (!child) return null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={t('family.resetSecretTitle', { name: child.display_name })}>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const sp = secretProblem(secret);
            if (sp) return setError(t(`errors.${sp}`));
            reset.mutate({ id: child.id, secret });
          }}
        >
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <Field label={t('onboarding.childSecret')} htmlFor="rs-secret" hint={t('onboarding.childSecretHint')}>
            <div className="flex gap-2">
              <Input id="rs-secret" value={secret} onChange={(e) => setSecret(e.target.value)} />
              <Button type="button" variant="outline" size="icon" aria-label={t('family.resetSecret')} onClick={() => setSecret(suggestSecret(i18n.language))}>
                <RefreshCw />
              </Button>
            </div>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" loading={reset.isPending}>{t('common.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InviteDialog({ open, onOpenChange, familyId }: { open: boolean; onOpenChange: (o: boolean) => void; familyId: string }) {
  const { t } = useTranslation();
  const [email, setEmail] = React.useState('');
  const [link, setLink] = React.useState<string | null>(null);
  const create = useAction(familyApi.createInvitation, { success: t('family.inviteCreated') });
  React.useEffect(() => {
    if (open) {
      setEmail('');
      setLink(null);
    }
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t('family.invite')} description={t('onboarding.inviteHint')}>
        {link ? (
          <>
            <InviteLinkBox link={link} />
            <DialogFooter><Button onClick={() => onOpenChange(false)}>{t('common.close')}</Button></DialogFooter>
          </>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate(
                { familyId, email: email.trim() || undefined },
                { onSuccess: (r) => setLink(`${window.location.origin}${window.location.pathname}#/invite/${r.token}`) },
              );
            }}
          >
            <Field label={t('family.inviteEmailOptional')} htmlFor="inv-email">
              <Input id="inv-email" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
              <Button type="submit" loading={create.isPending}>{t('common.create')}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
