import * as React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Star from 'lucide-react-native/icons/star';
import { formatDate, formatNumber } from '@/lib/dates';
import { useChildDay } from '@/api/progress';
import { useChildIdentity } from '@/auth/AuthProvider';
import { childTaskState, useCompleteTask } from '@/components/child';
import { Btn, CheckBox, ErrorState, Field, Grid, Input, ProgressBar, Row, Screen, Skeleton, T } from '@/components/ui';
import { pick, useDir } from '@/i18n';
import { colorStyle, DynamicIcon } from '@/lib/icons';
import { useLayout } from '@/lib/layout';
import { brand, R, useTheme } from '@/lib/theme';

export default function ChildTaskDetail() {
  const { taskId = '', date: dateParam } = useLocalSearchParams<{ taskId: string; date?: string }>();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { c } = useTheme();
  const L = useLayout();
  const dir = useDir();
  const router = useRouter();
  const { child, today } = useChildIdentity();
  const date = dateParam ?? today;
  const day = useChildDay(child.id, date);
  const task = day.data?.tasks.find((x) => x.task_id === taskId);
  const [checks, setChecks] = React.useState<Record<string, boolean>>({});
  const [note, setNote] = React.useState('');
  const complete = useCompleteTask();

  // start from what was saved before, once the task has loaded (or reloaded after a submission)
  const loadedFrom = task?.submission ?? null;
  const [syncedWith, setSyncedWith] = React.useState<typeof loadedFrom | undefined>(undefined);
  if (task && syncedWith !== loadedFrom) {
    setSyncedWith(loadedFrom);
    setChecks(task.submission?.checklist_state ?? {});
    setNote(task.submission?.child_note ?? '');
  }

  const Back = dir.rtl ? ChevronRight : ChevronLeft;
  const back = (
    <Row gap={4} style={{ marginBottom: 12 }}>
      <Back size={18} color={c.muted} />
      <T size={14} color={c.muted} onPress={() => (router.canGoBack() ? router.back() : router.replace('/child/tasks'))} accessibilityRole="link">
        {t('common.back')}
      </T>
    </Row>
  );

  if (day.isPending)
    return (
      <Screen maxWidth={760}>
        <Skeleton height={260} />
      </Screen>
    );
  if (day.isError)
    return (
      <Screen maxWidth={760}>
        {back}
        <ErrorState message={t('errors.generic')} />
      </Screen>
    );
  if (!task)
    return (
      <Screen maxWidth={760}>
        {back}
        <ErrorState message={t('errors.not_scheduled')} />
      </Screen>
    );

  const state = childTaskState(task);
  const editable = !day.data?.week_finalized && ['open', 'returned', 'rejected', 'progress'].includes(state);
  const total = task.checklist.length;
  const checked = task.checklist.filter((x) => checks[x.id]).length;
  const progress = total ? Math.round((checked / total) * 100) : 100;
  const tone = colorStyle(task.color, c);
  const send = (mode: 'independent' | 'reminded', p = progress) =>
    complete.mutate(
      { taskId: task.task_id, date, mode, progress: p, checklist: checks, note: note || null },
      { onSuccess: (r) => r.status !== 'in_progress' && router.replace('/child') },
    );

  return (
    <Screen maxWidth={760}>
      {back}
      <View style={{ gap: 18 }}>
        <Row gap={14}>
          <View style={{ width: 64, height: 64, borderRadius: R.card, backgroundColor: tone.tileBg, alignItems: 'center', justifyContent: 'center' }}>
            <DynamicIcon name={task.icon} size={32} color={tone.tileFg} />
          </View>
          <View style={{ flex: 1 }}>
            <T size={24} w="bold" accessibilityRole="header">
              {pick(lang, task.title_ar, task.title_en)}
            </T>
            <T color={c.muted}>{formatDate(date, lang)}</T>
          </View>
        </Row>
        {!!task.description && <T size={17}>{task.description}</T>}
        {!!task.instructions && (
          <View style={{ backgroundColor: c.surface2, borderRadius: R.card, padding: 14 }}>
            <T>{task.instructions}</T>
          </View>
        )}
        {!!task.submission?.review_note && (
          <View style={{ backgroundColor: c.surface, borderRadius: R.card, padding: 14, [dir.rtl ? 'borderRightWidth' : 'borderLeftWidth']: 4, borderColor: brand.sky500 }}>
            <T>{`💬 ${task.submission.review_note}`}</T>
          </View>
        )}

        {total > 0 && (
          <View style={{ gap: 8 }} accessibilityLabel={t('tasks.checklist')}>
            {task.checklist.map((item) => (
              <View
                key={item.id}
                style={{
                  borderRadius: R.card,
                  borderWidth: 1,
                  padding: L.tablet ? 18 : 14,
                  borderColor: checks[item.id] ? brand.leaf500 : c.border,
                  backgroundColor: checks[item.id] ? (c.dark ? 'rgba(31,169,113,0.1)' : 'rgba(213,245,231,0.5)') : c.surface,
                }}
              >
                <CheckBox big checked={!!checks[item.id]} disabled={!editable} onChange={(v) => setChecks({ ...checks, [item.id]: v })} label={item.label} />
              </View>
            ))}
            <ProgressBar value={progress} height={12} label={t('approvals.progress')} />
          </View>
        )}

        {editable && (
          <>
            <Field label={t('child.myNote')}>
              <Input value={note} onChangeText={setNote} maxLength={500} multiline style={{ minHeight: 80, textAlignVertical: 'top' }} />
            </Field>
            {progress < 100 ? (
              <Btn size="lg" variant="soft" loading={complete.isPending} onPress={() => send('independent', progress)}>
                {t('child.saveProgress')}
              </Btn>
            ) : (
              <Grid cols={L.cols(1, 2)} gap={10}>
                {task.reminder_count === 0 && (
                  <Btn size="xl" variant="gold" loading={complete.isPending} onPress={() => send('independent')} icon={(col, s) => <Star size={s} color={col} fill={col} />}>
                    {`${t('child.doneAlone')} +${formatNumber(task.base_points + task.independence_bonus, lang)}`}
                  </Btn>
                )}
                {!task.is_religious && (
                  <Btn size="xl" variant="soft" loading={complete.isPending} onPress={() => send('reminded')}>
                    {`${t('child.doneReminded')} +${formatNumber(task.base_points, lang)}`}
                  </Btn>
                )}
              </Grid>
            )}
          </>
        )}
        {!editable && state !== 'open' && (
          <View style={{ backgroundColor: c.surface2, borderRadius: R.card, padding: 16 }}>
            <T w="semibold" align="center">
              {state === 'done' ? t('child.approvedPts', { points: formatNumber(task.submission?.awarded_points ?? 0, lang) }) : t('child.waiting')}
            </T>
          </View>
        )}
      </View>
    </Screen>
  );
}
