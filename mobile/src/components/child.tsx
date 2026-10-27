import * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import Check from 'lucide-react-native/icons/check';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Clock3 from 'lucide-react-native/icons/clock-3';
import RotateCcw from 'lucide-react-native/icons/rotate-ccw';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Star from 'lucide-react-native/icons/star';
import type { CompletionMode, DayTask } from '@shared/lib/database.types';
import { formatNumber } from '@/lib/dates';
import { useAction } from '@/api/core';
import { scoreApi } from '@/api/progress';
import { pick, useDir } from '@/i18n';
import { colorStyle, DynamicIcon } from '@/lib/icons';
import { brand, R, shadow, useTheme } from '@/lib/theme';
import { useCelebrate } from './brand';
import { Badge, Btn, Input, Row, Sheet, T } from './ui';

export type ChildTaskState = 'done' | 'pending' | 'returned' | 'rejected' | 'progress' | 'open';

export function childTaskState(task: DayTask): ChildTaskState {
  switch (task.submission?.status) {
    case 'approved':
      return 'done';
    case 'pending':
      return 'pending';
    case 'returned':
      return 'returned';
    case 'rejected':
      return 'rejected';
    case 'in_progress':
      return 'progress';
    default:
      return 'open';
  }
}

/** Submits a task; the server decides the points (same messages as the website). */
export function useCompleteTask() {
  const { t } = useTranslation();
  const celebrate = useCelebrate();
  return useAction(scoreApi.submit, {
    success: (r) => {
      if (r.status === 'approved') {
        celebrate('small');
        return t('child.submittedAuto', { points: r.awarded_points ?? 0 });
      }
      return r.status === 'in_progress' ? t('child.progressSaved') : t('child.submitted');
    },
  });
}

/** Asks how the task was done, then submits. Tasks with a checklist open the detail page instead. */
export function CompleteSheet({ task, date, open, onClose }: { task: DayTask; date: string; open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const [note, setNote] = React.useState('');
  const complete = useCompleteTask();
  const forcedReminded = task.reminder_count > 0;
  const submit = (mode: CompletionMode) =>
    complete.mutate(
      { taskId: task.task_id, date, mode, note: note || null },
      {
        onSuccess: () => {
          setNote('');
          onClose();
        },
      },
    );
  return (
    <Sheet open={open} onClose={onClose} title={pick(i18n.language, task.title_ar, task.title_en)} description={t('child.howDidYouDo')}>
      <View style={{ gap: 12 }}>
        {!forcedReminded && !task.is_religious && (
          <Btn size="xl" variant="gold" loading={complete.isPending} onPress={() => submit('independent')} icon={(col, s) => <Star size={s} color={col} fill={col} />}>
            {`${t('child.doneAlone')}  +${formatNumber(task.base_points + task.independence_bonus, i18n.language)}`}
          </Btn>
        )}
        {task.is_religious ? (
          <Btn size="xl" variant="gold" loading={complete.isPending} onPress={() => submit('independent')} icon={(col, s) => <Check size={s} color={col} />}>
            {t('child.done')}
          </Btn>
        ) : (
          <Btn size="lg" variant="soft" loading={complete.isPending && forcedReminded} onPress={() => submit('reminded')}>
            {`${t('child.doneReminded')}  +${formatNumber(task.base_points, i18n.language)}`}
          </Btn>
        )}
        <Input value={note} onChangeText={setNote} placeholder={t('child.myNote')} accessibilityLabel={t('child.myNote')} maxLength={500} />
      </View>
    </Sheet>
  );
}

function StatePill({ task }: { task: DayTask }) {
  const { t, i18n } = useTranslation();
  const s = childTaskState(task);
  if (s === 'done') return <Badge tone="green">{t('child.approvedPts', { points: formatNumber(task.submission?.awarded_points ?? 0, i18n.language) })}</Badge>;
  if (s === 'pending') return <Badge tone="gold" icon={(col) => <Clock3 size={13} color={col} />}>{t('child.waiting')}</Badge>;
  if (s === 'returned') return <Badge tone="blue" icon={(col) => <RotateCcw size={13} color={col} />}>{t('child.returned')}</Badge>;
  if (s === 'rejected') return <Badge tone="muted">{t('child.notApproved')}</Badge>;
  if (s === 'progress') return <Badge tone="blue">{`${task.submission?.progress}%`}</Badge>;
  return null;
}

export function ChildTaskRow({ task, date, readOnly }: { task: DayTask; date: string; readOnly?: boolean }) {
  const { t, i18n } = useTranslation();
  const { c } = useTheme();
  const dir = useDir();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const s = childTaskState(task);
  const canAct = !readOnly && (s === 'open' || s === 'returned' || s === 'rejected' || s === 'progress');
  const needsDetail = task.checklist.length > 0;
  const tone = colorStyle(task.color, c);
  const title = pick(i18n.language, task.title_ar, task.title_en);
  const openDetail = () => router.push({ pathname: '/child/tasks/[taskId]', params: { taskId: task.task_id, date } });
  const Forward = dir.rtl ? ChevronLeft : ChevronRight;
  return (
    <View
      style={[
        {
          flexDirection: dir.row,
          alignItems: 'center',
          gap: 12,
          borderRadius: R.card,
          borderWidth: 1,
          padding: 12,
          borderColor: s === 'done' ? 'rgba(31,169,113,0.5)' : c.border,
          backgroundColor: s === 'done' ? (c.dark ? 'rgba(31,169,113,0.1)' : 'rgba(213,245,231,0.5)') : c.surface,
        },
        !c.dark ? shadow.soft : null,
      ]}
    >
      <View style={{ width: 50, height: 50, borderRadius: R.control, backgroundColor: tone.tileBg, alignItems: 'center', justifyContent: 'center' }}>
        <DynamicIcon name={task.icon} size={25} color={tone.tileFg} />
      </View>
      <Pressable onPress={openDetail} accessibilityRole="link" style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <T w="semibold">{title}</T>
        <Row gap={8} wrap>
          {s !== 'done' && (
            <T size={13} color={c.muted}>
              {task.is_religious ? t('child.privateTask') : `+${formatNumber(task.base_points + task.independence_bonus, i18n.language)} ⭐`}
            </T>
          )}
          {!!task.submission?.review_note && (
            <T size={13} color={c.muted} numberOfLines={1}>
              {`«${task.submission.review_note}»`}
            </T>
          )}
        </Row>
        <StatePill task={task} />
      </Pressable>
      {canAct &&
        (needsDetail ? (
          <Btn variant="soft" onPress={openDetail} label={title} icon={(col, sz) => <Forward size={sz} color={col} />} />
        ) : (
          <Btn variant="success" onPress={() => setOpen(true)} icon={(col, sz) => <Check size={sz} color={col} />}>
            {s === 'returned' || s === 'rejected' ? t('child.tryAgain') : t('child.done')}
          </Btn>
        ))}
      {canAct && !needsDetail && <CompleteSheet task={task} date={date} open={open} onClose={() => setOpen(false)} />}
    </View>
  );
}

/** Large icon tile for young children: tap the star when finished. */
export function SimpleTaskTile({ task, date }: { task: DayTask; date: string }) {
  const { t, i18n } = useTranslation();
  const { c } = useTheme();
  const dir = useDir();
  const complete = useCompleteTask();
  const s = childTaskState(task);
  const done = s === 'done' || s === 'pending';
  const tone = colorStyle(task.color, c);
  const title = pick(i18n.language, task.title_ar, task.title_en);
  return (
    <Pressable
      disabled={done || complete.isPending}
      onPress={() => complete.mutate({ taskId: task.task_id, date, mode: task.reminder_count > 0 ? 'reminded' : 'independent' })}
      accessibilityRole="button"
      accessibilityLabel={`${title} — ${done ? t('child.done') : t('child.simpleHint')}`}
      style={({ pressed }) => [
        {
          aspectRatio: 1,
          borderRadius: R.hero,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: 12,
          backgroundColor: done ? brand.leaf500 : c.surface,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
        !c.dark ? shadow.soft : null,
      ]}
    >
      <DynamicIcon name={task.icon} size={58} color={done ? '#fff' : tone.text} strokeWidth={1.75} />
      <T size={16} w="semibold" align="center" color={done ? '#fff' : c.fg} numberOfLines={2}>
        {title}
      </T>
      <Text style={{ position: 'absolute', top: 10, [dir.rtl ? 'left' : 'right']: 12, fontSize: 28 }}>{s === 'done' ? '⭐' : s === 'pending' ? '⏳' : '☆'}</Text>
    </Pressable>
  );
}

export function InitiativeQuickLink() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const dir = useDir();
  const router = useRouter();
  const fg = c.dark ? brand.gold300 : brand.gold800;
  const Forward = dir.rtl ? ChevronLeft : ChevronRight;
  return (
    <Pressable onPress={() => router.navigate('/child/initiatives')} accessibilityRole="link">
      <LinearGradient
        colors={c.dark ? ['rgba(242,183,5,0.2)', 'rgba(201,138,0,0.2)'] : [brand.gold100, 'rgba(255,213,74,0.7)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: R.card, padding: 16, flexDirection: dir.row, alignItems: 'center', gap: 12 }}
      >
        <Sparkles size={32} color={fg} />
        <View style={{ flex: 1 }}>
          <T w="semibold" color={fg}>
            {t('initiatives.childIntro')}
          </T>
          <T size={13} color={fg} style={{ opacity: 0.85 }}>
            {t('stars.golden')}
          </T>
        </View>
        <Forward size={22} color={fg} />
      </LinearGradient>
    </Pressable>
  );
}
