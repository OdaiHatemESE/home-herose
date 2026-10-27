import * as React from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import BellRing from 'lucide-react-native/icons/bell-ring';
import Check from 'lucide-react-native/icons/check';
import CircleDashed from 'lucide-react-native/icons/circle-dashed';
import Clock3 from 'lucide-react-native/icons/clock-3';
import type { AchievementLevel, Child, DayTask, FamilyWeekRow } from '@shared/lib/database.types';
import { formatNumber } from '@shared/lib/dates';
import { useAction } from '@/api/core';
import { scoreApi, useChildDay } from '@/api/progress';
import { pick, useDir } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { colorStyle, DynamicIcon } from '@/lib/icons';
import { brand, R, useTheme } from '@/lib/theme';
import { ChildAvatar, LevelBadge, MedalTrack, StarTally } from './brand';
import { Badge, Btn, Card, ErrorState, Row, Skeleton, Stat, T } from './ui';

export function useChildMap(children: Child[] | undefined) {
  return React.useMemo(() => new Map((children ?? []).map((c) => [c.id, c])), [children]);
}

/** Horizontal chip filter of children (avatars), with an "all" chip. Scrolls sideways on phones. */
export function ChildChips({ kids, value, onChange }: { kids: Child[]; value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const dir = useDir();
  const chip = (id: string, label: string, avatar?: Child) => {
    const on = value === id;
    return (
      <Pressable
        key={id || 'all'}
        onPress={() => onChange(id)}
        accessibilityRole="radio"
        accessibilityState={{ checked: on }}
        style={{
          flexDirection: dir.row,
          alignItems: 'center',
          gap: 6,
          borderRadius: 999,
          paddingVertical: avatar ? 4 : 8,
          paddingHorizontal: 14,
          [dir.rtl ? 'paddingRight' : 'paddingLeft']: avatar ? 4 : 14,
          backgroundColor: on ? brand.plum500 : c.surface2,
        }}
      >
        {avatar && <ChildAvatar avatar={avatar.avatar} color={avatar.color} size="sm" />}
        <T size={14} color={on ? '#fff' : c.fg} w={on ? 'semibold' : 'regular'}>
          {label}
        </T>
      </Pressable>
    );
  };
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={t('tasks.filterChild')} style={{ flexDirection: dir.row, flexWrap: 'wrap', gap: 8 }}>
      {chip('', t('common.all'))}
      {kids.map((k) => chip(k.id, k.display_name, k))}
    </View>
  );
}

export function taskState(task: DayTask): 'done' | 'pending' | 'open' | 'progress' {
  const s = task.submission?.status;
  if (s === 'approved') return 'done';
  if (s === 'pending') return 'pending';
  if (s === 'in_progress') return 'progress';
  return 'open';
}

/** One child's tasks for a day, with parent quick actions (remind / record completion). Same actions as the website. */
export function ChildTodayCard({ child, date }: { child: Child; date: string }) {
  const { t, i18n } = useTranslation();
  const { c } = useTheme();
  const lang = i18n.language;
  const day = useChildDay(child.id, date);
  const remind = useAction(scoreApi.remind, { success: t('dashboard.reminded', { count: 1 }) });
  const record = useAction(scoreApi.submit);
  const tasks = day.data?.tasks ?? [];
  const counted = tasks.filter((x) => x.counts_toward_max);
  const done = counted.filter((x) => taskState(x) === 'done').length;
  const pending = counted.filter((x) => taskState(x) === 'pending').length;

  return (
    <Card style={{ gap: 12 }}>
      <Row gap={12}>
        <ChildAvatar avatar={child.avatar} color={child.color} />
        <View style={{ flex: 1 }}>
          <T w="semibold">{child.display_name}</T>
          <T size={13} color={c.muted}>
            {`${formatNumber(done, lang)}/${formatNumber(counted.length, lang)} ${t('dashboard.todayDone')}${pending > 0 ? ` — ${formatNumber(pending, lang)} ${t('dashboard.todayPending')}` : ''}`}
          </T>
        </View>
      </Row>
      {day.isPending ? (
        <View style={{ gap: 8 }}>
          <Skeleton height={44} />
          <Skeleton height={44} />
        </View>
      ) : day.isError ? (
        <ErrorState message={errorMessage(day.error)} onRetry={() => void day.refetch()} />
      ) : tasks.length === 0 ? (
        <T size={14} color={c.muted}>
          {t('child.noTasks')}
        </T>
      ) : (
        <View style={{ gap: 6 }}>
          {tasks.map((task) => {
            const state = taskState(task);
            const tone = colorStyle(task.color, c);
            const title = pick(lang, task.title_ar, task.title_en);
            return (
              <Row key={task.task_id} gap={10} style={{ backgroundColor: c.surface2, borderRadius: R.control, paddingHorizontal: 10, paddingVertical: 8 }}>
                <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: tone.tileBg, alignItems: 'center', justifyContent: 'center' }}>
                  <DynamicIcon name={task.icon} size={17} color={tone.tileFg} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T size={14} numberOfLines={1}>
                    {title}
                  </T>
                </View>
                {task.reminder_count > 0 && (
                  <Badge tone="pink" icon={(col) => <BellRing size={12} color={col} />}>
                    {formatNumber(task.reminder_count, lang)}
                  </Badge>
                )}
                {state === 'done' ? (
                  <Badge tone="green" icon={(col) => <Check size={12} color={col} />}>
                    {`+${formatNumber(task.submission?.awarded_points ?? 0, lang)}`}
                  </Badge>
                ) : state === 'pending' ? (
                  <Badge tone="gold" icon={(col) => <Clock3 size={12} color={col} />}>
                    {t('status.pending')}
                  </Badge>
                ) : (
                  <Row gap={4}>
                    {state === 'progress' && (
                      <Badge tone="blue" icon={(col) => <CircleDashed size={12} color={col} />}>
                        {`${task.submission?.progress}%`}
                      </Badge>
                    )}
                    {!task.is_religious && (
                      <Btn
                        size="sm"
                        variant="ghost"
                        label={`${t('dashboard.remind')} — ${title}`}
                        disabled={remind.isPending}
                        onPress={() => remind.mutate({ childId: child.id, taskId: task.task_id, date })}
                        icon={(col, s) => <BellRing size={s} color={col} />}
                      />
                    )}
                    <Btn
                      size="sm"
                      variant="soft"
                      label={`${t('dashboard.markForChild')} — ${title}`}
                      disabled={record.isPending}
                      onPress={() => record.mutate({ taskId: task.task_id, date, childId: child.id, mode: task.reminder_count > 0 ? 'reminded' : 'independent' })}
                      icon={(col, s) => <Check size={s} color={col} />}
                    />
                  </Row>
                )}
              </Row>
            );
          })}
        </View>
      )}
    </Card>
  );
}

export function ChildWeekCard({ row, levels }: { row: FamilyWeekRow; levels: AchievementLevel[] }) {
  const { t, i18n } = useTranslation();
  const { c } = useTheme();
  const lang = i18n.language;
  const indepShare = row.approved_tasks ? Math.round((row.independent_tasks / row.approved_tasks) * 100) : null;
  return (
    <Card style={{ padding: 18 }}>
      <Row gap={12}>
        <ChildAvatar avatar={row.avatar} color={row.color} size="lg" />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <T size={17} w="semibold" numberOfLines={1}>
            {row.display_name}
          </T>
          <StarTally regular={Math.max(0, row.approved_points - row.initiative_points)} golden={row.initiative_points} size={14} />
        </View>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <T size={28} w="bold" align="center">
            {row.percent === null ? '—' : `${formatNumber(row.percent, lang, 0)}%`}
          </T>
          <LevelBadge level={row.level} size="sm" />
        </View>
      </Row>
      <MedalTrack percent={row.percent} levels={levels} style={{ marginTop: 6 }} />
      <Row gap={8}>
        <Stat label={t('progress.approved')} value={`${formatNumber(row.approved_points, lang)}/${formatNumber(row.max_points, lang)}`} />
        <Stat label={t('progress.pending')} value={formatNumber(row.pending_points, lang)} />
        <Stat label={t('dashboard.independenceTrend')} value={indepShare === null ? '—' : `${formatNumber(indepShare, lang)}%`} />
      </Row>
      {row.reminders_logged > 0 && (
        <T size={12} color={c.muted} style={{ marginTop: 8 }}>
          {`${t('progress.remindersLogged')}: ${formatNumber(row.reminders_logged, lang)}`}
        </T>
      )}
    </Card>
  );
}
