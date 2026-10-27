import * as React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import BellRing from 'lucide-react-native/icons/bell-ring';
import Check from 'lucide-react-native/icons/check';
import CircleDashed from 'lucide-react-native/icons/circle-dashed';
import Clock3 from 'lucide-react-native/icons/clock-3';
import Star from 'lucide-react-native/icons/star';
import type { AchievementLevel, Child, DayTask, FamilyWeekRow } from '@shared/lib/database.types';
import { useAction } from '@/api/core';
import { scoreApi, useChildDay } from '@/api/progress';
import { pick, useDir } from '@/i18n';
import { formatNumber } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { colorStyle, DynamicIcon, avatarEmoji } from '@/lib/icons';
import { useLayout } from '@/lib/layout';
import { brand, R, shadow, useTheme } from '@/lib/theme';
import { ChildAvatar, LevelBadge, MedalTrack } from './brand';
import { ProgressRing } from './ProgressRing';
import { Badge, ErrorState, Row, Skeleton, Stat, T } from './ui';

export function useChildMap(children: Child[] | undefined) {
  return React.useMemo(() => new Map((children ?? []).map((c) => [c.id, c])), [children]);
}

export function taskState(task: DayTask): 'done' | 'pending' | 'open' | 'progress' {
  const s = task.submission?.status;
  if (s === 'approved') return 'done';
  if (s === 'pending') return 'pending';
  if (s === 'in_progress') return 'progress';
  return 'open';
}

/** A hero in the family strip: progress ring around the emblem, name, stars. Tap to select. */
export function KidCard({ row, selected, onPress, compact }: { row: FamilyWeekRow; selected: boolean; onPress: () => void; compact?: boolean }) {
  const { c } = useTheme();
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const tone = colorStyle(row.color, c);
  const ring = compact ? 76 : 92;
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      android_ripple={{ color: 'rgba(109,63,214,0.12)' }}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${row.display_name} ${row.percent === null ? '' : `${Math.round(row.percent)}%`}`}
      style={[
        {
          alignItems: 'center',
          gap: 6,
          paddingVertical: 14,
          paddingHorizontal: 8,
          borderRadius: R.hero,
          backgroundColor: selected ? (c.dark ? 'rgba(154,118,240,0.22)' : brand.plum50) : c.surface,
          borderWidth: 2,
          borderColor: selected ? brand.plum500 : 'transparent',
        },
        !c.dark && !selected ? shadow.soft : null,
      ]}
    >
      <ProgressRing percent={row.percent} size={ring} stroke={compact ? 7 : 8}>
        <View style={{ width: ring - 22, height: ring - 22, borderRadius: ring, backgroundColor: tone.tileBg, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: compact ? 28 : 34 }}>{avatarEmoji(row.avatar)}</Text>
        </View>
      </ProgressRing>
      <T size={compact ? 15 : 16} w="bold" align="center" numberOfLines={1}>
        {row.display_name}
      </T>
      <Row gap={6} justify="center">
        <T size={14} w="semibold" color={c.dark ? brand.plum200 : brand.plum600}>
          {row.percent === null ? '—' : `${formatNumber(row.percent, lang, 0)}%`}
        </T>
        <Row gap={2}>
          <Star size={13} color={brand.gold400} fill={brand.gold400} />
          <T size={13} color={c.muted}>
            {formatNumber(row.approved_points, lang)}
          </T>
        </Row>
      </Row>
    </Pressable>
  );
}

/** The selected hero's week: level, ribbon, three numbers. */
export function KidWeek({ row, levels }: { row: FamilyWeekRow; levels: AchievementLevel[] }) {
  const { t, i18n } = useTranslation();
  const { c } = useTheme();
  const lang = i18n.language;
  const indep = row.approved_tasks ? Math.round((row.independent_tasks / row.approved_tasks) * 100) : null;
  return (
    <View style={{ gap: 10 }}>
      <Row gap={14}>
        <ChildAvatar avatar={row.avatar} color={row.color} size="lg" />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <T size={20} w="bold" numberOfLines={1}>
            {row.display_name}
          </T>
          <LevelBadge level={row.level} size="sm" />
        </View>
        <T size={34} w="bold" color={c.dark ? brand.plum200 : brand.plum600}>
          {row.percent === null ? '—' : `${formatNumber(row.percent, lang, 0)}%`}
        </T>
      </Row>
      <MedalTrack percent={row.percent} levels={levels} />
      <Row gap={8}>
        <Stat label={t('progress.approved')} value={`${formatNumber(row.approved_points, lang)}/${formatNumber(row.max_points, lang)}`} />
        <Stat label={t('progress.pending')} value={formatNumber(row.pending_points, lang)} />
        <Stat label={t('dashboard.independenceTrend')} value={indep === null ? '—' : `${formatNumber(indep, lang)}%`} />
      </Row>
      {row.reminders_logged > 0 && (
        <T size={12.5} color={c.muted}>
          {`${t('progress.remindersLogged')}: ${formatNumber(row.reminders_logged, lang)}`}
        </T>
      )}
    </View>
  );
}

/** The selected hero's tasks today, with the parent's quick actions (remind / record) — same actions as the website. */
export function KidToday({ child, date }: { child: Child; date: string }) {
  const { t, i18n } = useTranslation();
  const { c } = useTheme();
  const dir = useDir();
  const L = useLayout();
  const lang = i18n.language;
  const day = useChildDay(child.id, date);
  const remind = useAction(scoreApi.remind, { success: t('dashboard.reminded', { count: 1 }) });
  const record = useAction(scoreApi.submit);
  const tasks = day.data?.tasks ?? [];
  const counted = tasks.filter((x) => x.counts_toward_max);
  const done = counted.filter((x) => taskState(x) === 'done').length;
  const pending = counted.filter((x) => taskState(x) === 'pending').length;

  return (
    <View style={{ gap: 10 }}>
      <Row justify="space-between">
        <T size={17} w="bold">
          {t('child.todayTasks')}
        </T>
        <T size={13} color={c.muted}>
          {`${formatNumber(done, lang)}/${formatNumber(counted.length, lang)} ${t('dashboard.todayDone')}${pending ? ` · ${formatNumber(pending, lang)} ${t('dashboard.todayPending')}` : ''}`}
        </T>
      </Row>
      {day.isPending ? (
        <View style={{ gap: 8 }}>
          <Skeleton height={58} />
          <Skeleton height={58} />
          <Skeleton height={58} />
        </View>
      ) : day.isError ? (
        <ErrorState message={errorMessage(day.error)} onRetry={() => void day.refetch()} />
      ) : tasks.length === 0 ? (
        <T color={c.muted}>{t('child.noTasks')}</T>
      ) : (
        <View style={{ borderRadius: R.card, overflow: 'hidden', backgroundColor: c.surface }}>
          {tasks.map((task, i) => {
            const state = taskState(task);
            const tone = colorStyle(task.color, c);
            const title = pick(lang, task.title_ar, task.title_en);
            return (
              <View key={task.task_id} style={{ flexDirection: dir.row, alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderColor: c.border }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: tone.tileBg, alignItems: 'center', justifyContent: 'center' }}>
                  <DynamicIcon name={task.icon} size={20} color={tone.tileFg} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <T size={15} w="medium" numberOfLines={1}>
                    {title}
                  </T>
                  {task.reminder_count > 0 && (
                    <Row gap={4}>
                      <BellRing size={12} color={brand.rose500} />
                      <T size={12} color={brand.rose500}>
                        {`${t('progress.remindersLogged')}: ${formatNumber(task.reminder_count, lang)}`}
                      </T>
                    </Row>
                  )}
                </View>
                {state === 'done' ? (
                  <Badge tone="green" icon={(col) => <Check size={13} color={col} />}>
                    {`+${formatNumber(task.submission?.awarded_points ?? 0, lang)}`}
                  </Badge>
                ) : state === 'pending' ? (
                  <Badge tone="gold" icon={(col) => <Clock3 size={13} color={col} />}>
                    {t('status.pending')}
                  </Badge>
                ) : (
                  <Row gap={8}>
                    {state === 'progress' && (
                      <Badge tone="blue" icon={(col) => <CircleDashed size={13} color={col} />}>
                        {`${task.submission?.progress}%`}
                      </Badge>
                    )}
                    {!task.is_religious && (
                      <ActionChip
                        label={L.tablet ? t('dashboard.remind') : undefined}
                        a11y={`${t('dashboard.remind')} — ${title}`}
                        icon={(col) => <BellRing size={18} color={col} />}
                        tone="neutral"
                        disabled={remind.isPending}
                        onPress={() => remind.mutate({ childId: child.id, taskId: task.task_id, date })}
                      />
                    )}
                    <ActionChip
                      label={L.tablet ? t('dashboard.markForChild') : undefined}
                      a11y={`${t('dashboard.markForChild')} — ${title}`}
                      icon={(col) => <Check size={18} color={col} />}
                      tone="primary"
                      disabled={record.isPending}
                      onPress={() => record.mutate({ taskId: task.task_id, date, childId: child.id, mode: task.reminder_count > 0 ? 'reminded' : 'independent' })}
                    />
                  </Row>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function ActionChip({ label, a11y, icon, tone, onPress, disabled }: { label?: string; a11y: string; icon: (color: string) => React.ReactNode; tone: 'primary' | 'neutral'; onPress: () => void; disabled?: boolean }) {
  const { c } = useTheme();
  const dir = useDir();
  const bg = tone === 'primary' ? (c.dark ? 'rgba(154,118,240,0.3)' : brand.plum100) : c.surface2;
  const fg = tone === 'primary' ? (c.dark ? brand.plum200 : brand.plum700) : c.fg;
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      android_ripple={{ color: 'rgba(109,63,214,0.15)' }}
      hitSlop={6}
      style={({ pressed }) => ({
        flexDirection: dir.row,
        alignItems: 'center',
        gap: 6,
        height: 40,
        minWidth: 40,
        paddingHorizontal: label ? 14 : 0,
        justifyContent: 'center',
        borderRadius: 999,
        backgroundColor: bg,
        opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      })}
    >
      {icon(fg)}
      {!!label && (
        <T size={13.5} w="semibold" color={fg}>
          {label}
        </T>
      )}
    </Pressable>
  );
}
