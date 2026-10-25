import * as React from 'react';
import { useTranslation } from 'react-i18next';
import type { Child, Skill } from '@/lib/database.types';
import { pick } from '@/i18n';
import { scoreApi } from '@/api/progress';
import { useAction } from '@/api/core';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/label';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Segmented } from '@/components/ui/controls';

export function AdjustPointsDialog({ open, onOpenChange, child, skills, today }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  child: Child | null;
  skills: Skill[];
  today: string;
}) {
  const { t, i18n } = useTranslation();
  const [points, setPoints] = React.useState(1);
  const [reason, setReason] = React.useState('');
  const [date, setDate] = React.useState(today);
  const [kind, setKind] = React.useState<'adjustment' | 'bonus'>('bonus');
  const [skillId, setSkillId] = React.useState('');
  const action = useAction(scoreApi.adjust, { success: t('points.adjusted') });

  React.useEffect(() => {
    if (open) {
      setPoints(1);
      setReason('');
      setDate(today);
      setSkillId('');
    }
  }, [open, today]);

  if (!child) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`${t('points.adjustTitle')} — ${child.display_name}`} description={t('points.adjustHint')}>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            action.mutate(
              { childId: child.id, points: kind === 'bonus' ? Math.abs(points) : points, reason, date, skillId: skillId || null, kind },
              { onSuccess: () => onOpenChange(false) },
            );
          }}
        >
          <Segmented
            label={t('points.adjust')}
            value={kind}
            onChange={setKind}
            options={[
              { value: 'bonus', label: t('points.kindBonus') },
              { value: 'adjustment', label: t('points.kindAdjustment') },
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('points.amount')} htmlFor="adj-points">
              <Input id="adj-points" type="number" min={kind === 'bonus' ? 1 : -100} max={100} value={points} onChange={(e) => setPoints(Number(e.target.value))} required />
            </Field>
            <Field label={t('common.date')} htmlFor="adj-date">
              <Input id="adj-date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
          </div>
          <Field label={t('common.reason')} htmlFor="adj-reason">
            <Textarea id="adj-reason" value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} />
          </Field>
          <Field label={t('points.linkedSkill')} htmlFor="adj-skill">
            <Select id="adj-skill" value={skillId} onChange={(e) => setSkillId(e.target.value)}>
              <option value="">{t('common.none')}</option>
              {skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {pick(i18n.language, s.name_ar, s.name_en)}
                </option>
              ))}
            </Select>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={action.isPending} disabled={reason.trim().length < 3 || points === 0}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
