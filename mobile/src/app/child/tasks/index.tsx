import * as React from 'react';
import { Pressable, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { addDays, formatDate } from '@shared/lib/dates';
import { useChildDay } from '@/api/progress';
import { useChildIdentity } from '@/auth/AuthProvider';
import { ChildTaskRow, SimpleTaskTile } from '@/components/child';
import { ErrorState, Grid, PageHeader, Screen, Skeleton, T } from '@/components/ui';
import { useDir } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { useLayout } from '@/lib/layout';
import { brand, R, useTheme } from '@/lib/theme';

export default function ChildTasks() {
  const { t, i18n } = useTranslation();
  const { c } = useTheme();
  const L = useLayout();
  const dir = useDir();
  const qc = useQueryClient();
  const { child, today } = useChildIdentity();
  const [offset, setOffset] = React.useState(0);
  const date = addDays(today, -offset);
  const day = useChildDay(child.id, date);
  const tasks = day.data?.tasks ?? [];
  const groups = [
    { key: 'daily', title: t('child.todayTasks'), items: tasks.filter((x) => ['daily', 'weekdays', 'one_time'].includes(x.recurrence)) },
    { key: 'weekly', title: t('child.weekly'), items: tasks.filter((x) => x.recurrence === 'weekly') },
    { key: 'occasional', title: t('child.occasional'), items: tasks.filter((x) => x.recurrence === 'occasional') },
  ];
  const options = [
    { value: 0, label: t('common.today') },
    { value: 1, label: formatDate(addDays(today, -1), i18n.language, { weekday: 'long' }) },
    { value: 2, label: formatDate(addDays(today, -2), i18n.language, { weekday: 'long' }) },
  ];

  return (
    <Screen onRefresh={() => qc.invalidateQueries({ queryKey: ['day'] })} maxWidth={L.wide ? 1100 : 900}>
      <PageHeader title={t('nav.myTasks')} description={formatDate(date, i18n.language)} />
      <View accessibilityRole="radiogroup" accessibilityLabel={t('common.date')} style={{ flexDirection: dir.row, backgroundColor: c.surface2, borderRadius: R.control, padding: 4, gap: 4, marginBottom: 18 }}>
        {options.map((o) => {
          const on = o.value === offset;
          return (
            <Pressable
              key={o.value}
              onPress={() => setOffset(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={{ flex: 1, paddingVertical: 9, borderRadius: 9, backgroundColor: on ? c.surface : 'transparent' }}
            >
              <T size={14} w={on ? 'semibold' : 'regular'} align="center" color={on ? (c.dark ? brand.plum200 : brand.plum600) : c.muted}>
                {o.label}
              </T>
            </Pressable>
          );
        })}
      </View>
      {day.isPending ? (
        <View style={{ gap: 8 }}>
          <Skeleton height={72} />
          <Skeleton height={72} />
        </View>
      ) : day.isError ? (
        <ErrorState message={errorMessage(day.error)} onRetry={() => void day.refetch()} />
      ) : tasks.length === 0 ? (
        <View style={{ backgroundColor: c.surface, borderRadius: R.card, padding: 22 }}>
          <T align="center" color={c.muted}>
            {t('child.noTasks')}
          </T>
        </View>
      ) : (
        <View style={{ gap: 22 }}>
          {day.data?.week_finalized && (
            <View style={{ backgroundColor: c.surface2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
              <T size={14} color={c.muted}>
                {t('errors.week_finalized')}
              </T>
            </View>
          )}
          {groups
            .filter((g) => g.items.length)
            .map((g) => (
              <View key={g.key} accessibilityLabel={g.title}>
                <T size={17} w="semibold" style={{ marginBottom: 8 }}>
                  {g.title}
                </T>
                {child.ui_mode === 'simple' ? (
                  <Grid cols={L.cols(2, 3, 4)} gap={12}>
                    {g.items.map((x) => (
                      <SimpleTaskTile key={x.task_id} task={x} date={date} />
                    ))}
                  </Grid>
                ) : (
                  <Grid cols={L.cols(1, 1, 2)} gap={8}>
                    {g.items.map((x) => (
                      <ChildTaskRow key={x.task_id} task={x} date={date} readOnly={day.data?.week_finalized} />
                    ))}
                  </Grid>
                )}
              </View>
            ))}
        </View>
      )}
    </Screen>
  );
}
