import * as React from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Award from 'lucide-react-native/icons/award';
import { addDays, dayOfWeek, formatDate, formatNumber, weekStartFor } from '@shared/lib/dates';
import { nextLevel } from '@shared/lib/scoring';
import { useEarnedAchievements, useFamilyTable } from '@/api/content';
import { useChildDay, useChildProgress } from '@/api/progress';
import { useChildIdentity } from '@/auth/AuthProvider';
import { ChildAvatar, LevelBadge, levelName, MedalTrack, StarTally, useCelebrate } from '@/components/brand';
import { ChildTaskRow, childTaskState, InitiativeQuickLink, SimpleTaskTile } from '@/components/child';
import { ErrorState, Grid, Row, Screen, SectionTitle, Skeleton, T } from '@/components/ui';
import { pick, useDir } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { useLayout } from '@/lib/layout';
import { brand, R, shadow, useTheme } from '@/lib/theme';

export default function ChildDashboard() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { c } = useTheme();
  const L = useLayout();
  const dir = useDir();
  const router = useRouter();
  const qc = useQueryClient();
  const celebrate = useCelebrate();
  const { child, family, settings, today } = useChildIdentity();
  const simple = child.ui_mode === 'simple';
  const ws = weekStartFor(today, settings.week_start_day);
  const day = useChildDay(child.id, today);
  const week = useChildProgress(child.id, ws, addDays(ws, 6));
  const levels = useFamilyTable('achievement_levels', family.id, 'rank');
  const earned = useEarnedAchievements({ childId: child.id });
  const defs = useFamilyTable('achievement_definitions', family.id, 'threshold');

  const tasks = day.data?.tasks ?? [];
  const counted = tasks.filter((x) => x.counts_toward_max);
  const allDone = counted.length > 0 && counted.every((x) => ['done', 'pending'].includes(childTaskState(x)));
  const wasDone = React.useRef<boolean | null>(null);
  React.useEffect(() => {
    if (!day.data) return;
    if (wasDone.current === false && allDone) celebrate('big');
    wasDone.current = allDone;
  }, [allDone, day.data, celebrate]);

  const motivational = t('child.motivational', { returnObjects: true }) as unknown as string[];
  const message = Array.isArray(motivational) ? motivational[(dayOfWeek(today) + child.display_name.length) % motivational.length] : '';
  const w = week.data;
  const next = nextLevel(w?.percent ?? null, levels.data ?? []);
  const golden = w?.initiative_points ?? 0;
  const regular = Math.max(0, (w?.approved_points ?? 0) - golden);
  const refresh = () => qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'identity' });

  const hero = (
    <LinearGradient colors={[brand.plum500, brand.plum600, brand.plum700]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: R.hero, padding: L.tablet ? 24 : 18, gap: 14 }, shadow.lift]}>
      <Row gap={14}>
        <ChildAvatar avatar={child.avatar} color={child.color} size={simple ? 'xl' : 'lg'} ring="rgba(255,255,255,0.4)" />
        <View style={{ flex: 1 }}>
          <T display size={L.tablet ? 40 : 32} color="#fff">
            {t('child.hello')}
          </T>
          <T size={17} color={brand.plum100}>
            {child.display_name}
          </T>
        </View>
      </Row>
      <View style={{ backgroundColor: c.dark ? 'rgba(22,17,42,0.9)' : 'rgba(255,255,255,0.96)', borderRadius: R.card, padding: 14 }}>
        {week.isPending ? (
          <Skeleton height={80} />
        ) : week.isError ? (
          <ErrorState message={errorMessage(week.error)} />
        ) : (
          <>
            <Row justify="space-between" wrap gap={10}>
              <View style={{ gap: 4 }}>
                <T size={13} color={c.muted}>
                  {t('child.level')}
                </T>
                <LevelBadge level={w?.level} size="lg" />
              </View>
              <View style={{ gap: 4, alignItems: dir.alignEnd }}>
                <T size={13} color={c.muted}>
                  {t('child.stars')}
                </T>
                <StarTally regular={regular} golden={golden} size={19} />
              </View>
            </Row>
            <MedalTrack percent={w?.percent ?? 0} levels={levels.data ?? []} size="lg" />
            <T size={14}>
              {(next ? t('progress.toNext', { missing: formatNumber(next.missing, lang, 1), level: levelName(next.level, lang) }) : t('progress.topLevel')) +
                (w?.pending_points ? ` — ${t('child.waitingStars')}: ${formatNumber(w.pending_points, lang)}` : '')}
            </T>
          </>
        )}
      </View>
    </LinearGradient>
  );

  const todayList = (
    <View>
      <Row justify="space-between" align="flex-end" style={{ marginBottom: 10 }}>
        <T size={19} w="bold" accessibilityRole="header">
          {t('child.todayTasks')}
        </T>
        <T size={13} color={c.muted}>
          {formatDate(today, lang)}
        </T>
      </Row>
      {allDone && (
        <View accessibilityRole="alert" style={{ backgroundColor: c.dark ? 'rgba(31,169,113,0.15)' : brand.leaf100, borderRadius: R.card, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 }}>
          <T w="semibold" color={c.dark ? brand.leaf100 : brand.emerald800}>
            {t('child.allDone')}
          </T>
        </View>
      )}
      {day.isPending ? (
        <View style={{ gap: 8 }}>
          <Skeleton height={72} />
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
      ) : simple ? (
        <Grid cols={L.cols(2, 3, 4)} gap={12}>
          {tasks
            .filter((x) => x.recurrence !== 'occasional')
            .map((x) => (
              <SimpleTaskTile key={x.task_id} task={x} date={today} />
            ))}
        </Grid>
      ) : (
        <View style={{ gap: 8 }}>
          {tasks
            .filter((x) => x.recurrence !== 'occasional')
            .map((x) => (
              <ChildTaskRow key={x.task_id} task={x} date={today} readOnly={day.data?.week_finalized} />
            ))}
        </View>
      )}
      {!simple && tasks.some((x) => x.recurrence === 'occasional') && (
        <T size={14} color={c.primaryText} onPress={() => router.navigate('/child/tasks')} accessibilityRole="link" style={{ marginTop: 8 }}>
          {`${t('child.occasional')} ›`}
        </T>
      )}
    </View>
  );

  const weeklyMessage = (
    <View style={{ backgroundColor: c.surface, borderRadius: R.card, padding: 16, [dir.rtl ? 'borderRightWidth' : 'borderLeftWidth']: 4, borderColor: brand.rose500 }}>
      <T size={13} color={c.muted}>
        {t('child.weeklyMessage')}
      </T>
      <T size={17} w="medium" style={{ marginTop: 4 }}>
        {pick(lang, w?.level?.message_ar, w?.level?.message_en) || message}
      </T>
    </View>
  );

  const badges = !simple ? (
    <View>
      <SectionTitle
        action={
          <T size={14} color={c.primaryText} onPress={() => router.navigate('/child/achievements')} accessibilityRole="link">
            {t('child.seeAll')}
          </T>
        }
      >
        {t('child.achievementsTitle')}
      </SectionTitle>
      {!earned.data?.length ? (
        <Row gap={8}>
          <Award size={20} color={c.muted} />
          <T color={c.muted}>{t('child.achievementsEmpty')}</T>
        </Row>
      ) : (
        <Row wrap gap={8}>
          {earned.data.slice(0, 6).map((e) => {
            const d = defs.data?.find((x) => x.id === e.achievement_id);
            return d ? (
              <Row key={e.id} gap={8} style={{ backgroundColor: c.dark ? 'rgba(242,183,5,0.15)' : brand.gold100, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 }}>
                <Text style={{ fontSize: 18 }}>{d.icon}</Text>
                <T size={14} color={c.dark ? brand.gold300 : brand.gold800}>
                  {pick(lang, d.name_ar, d.name_en)}
                </T>
              </Row>
            ) : null;
          })}
        </Row>
      )}
    </View>
  ) : null;

  // Tablet landscape: progress on one side, today's tasks on the other.
  if (L.wide) {
    return (
      <Screen onRefresh={refresh} maxWidth={1240}>
        <View style={{ flexDirection: dir.row, gap: 24, alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: 20 }}>
            {hero}
            <InitiativeQuickLink />
            {weeklyMessage}
            {badges}
          </View>
          <View style={{ flex: 1.15 }}>{todayList}</View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen onRefresh={refresh} maxWidth={900}>
      <View style={{ gap: 22 }}>
        {hero}
        {todayList}
        <InitiativeQuickLink />
        {weeklyMessage}
        {badges}
      </View>
    </Screen>
  );
}
