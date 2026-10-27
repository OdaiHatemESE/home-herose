import * as React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import ClipboardCheck from 'lucide-react-native/icons/clipboard-check';
import Copy from 'lucide-react-native/icons/copy';
import Gift from 'lucide-react-native/icons/gift';
import Lightbulb from 'lucide-react-native/icons/lightbulb';
import ListTodo from 'lucide-react-native/icons/list-todo';
import UserPlus from 'lucide-react-native/icons/user-plus';
import { addDays, formatDate, formatMoney, formatNumber, weekStartFor } from '@shared/lib/dates';
import { useFamilyTable, useNotes } from '@/api/content';
import { useChildren } from '@/api/family';
import { useInitiatives } from '@/api/initiatives';
import { useFamilyWeek, usePendingSubmissions, useSnapshots } from '@/api/progress';
import { useFulfillments } from '@/api/rewards';
import { useParent } from '@/auth/AuthProvider';
import { ChildAvatar } from '@/components/brand';
import { LineChart } from '@/components/LineChart';
import { ChildChips, ChildTodayCard, ChildWeekCard, useChildMap } from '@/components/parent';
import { toast } from '@/components/toast';
import { Btn, Card, EmptyState, ErrorState, Grid, PageHeader, Row, Screen, SectionTitle, Skeleton, T } from '@/components/ui';
import { useDir } from '@/i18n';
import { colorHex } from '@/lib/chartColors';
import { errorMessage } from '@/lib/errors';
import { useLayout } from '@/lib/layout';
import { brand, R, useTheme } from '@/lib/theme';

export default function ParentDashboard() {
  const { t, i18n } = useTranslation();
  const { c } = useTheme();
  const L = useLayout();
  const router = useRouter();
  const qc = useQueryClient();
  const { familyId, family, settings, profile, today, membership } = useParent();
  const lang = i18n.language;
  const weekStart = weekStartFor(today, settings.week_start_day);
  const children = useChildren(familyId);
  const childMap = useChildMap(children.data);
  const week = useFamilyWeek(familyId, weekStart);
  const levels = useFamilyTable('achievement_levels', familyId, 'rank');
  const pending = usePendingSubmissions(familyId);
  const initiatives = useInitiatives({ familyId, status: 'pending' });
  const owed = useFulfillments({ familyId, open: true });
  const notes = useNotes({ familyId });
  const [childFilter, setChildFilter] = React.useState('');

  const visibleWeek = (week.data ?? []).filter((r) => !childFilter || r.child_id === childFilter);
  const visibleChildren = (children.data ?? []).filter((k) => !childFilter || k.id === childFilter);
  const followUps = (notes.data ?? []).filter((n) => n.follow_up && !n.follow_up_done && (!n.follow_up_due || n.follow_up_due <= today));
  const unpaid = (owed.data ?? []).filter((f) => f.payment_status === 'unpaid' && f.status !== 'cancelled').reduce((s, f) => s + Number(f.amount ?? 0), 0);
  const greeting = t('dashboard.greeting', { name: profile?.display_name ?? membership.display_name ?? '' });
  const refresh = () => qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'identity' });

  if (children.data && children.data.length === 0) {
    return (
      <Screen onRefresh={refresh}>
        <PageHeader title={greeting} />
        <EmptyState
          icon="🏆"
          title={t('dashboard.noChildren')}
          action={
            <Btn onPress={() => router.navigate('/parent/family')} icon={(col, s) => <UserPlus size={s} color={col} />}>
              {t('dashboard.addChildren')}
            </Btn>
          }
        />
      </Screen>
    );
  }

  const familyCode = (
    <Pressable
      onPress={() => void Clipboard.setStringAsync(family.family_code).then(() => toast.success(t('common.copied')))}
      accessibilityRole="button"
      accessibilityLabel={`${t('dashboard.familyCode')} ${family.family_code}`}
      style={{ borderRadius: 999, backgroundColor: c.dark ? 'rgba(242,183,5,0.15)' : brand.gold100, paddingHorizontal: 14, paddingVertical: 8 }}
    >
      <Row gap={8}>
        {L.tablet && (
          <T size={13} color={c.dark ? brand.gold300 : brand.gold800}>
            {t('dashboard.familyCode')}
          </T>
        )}
        <T size={15} w="bold" ltr color={c.dark ? brand.gold300 : brand.gold800} style={{ letterSpacing: 2.5 }}>
          {family.family_code}
        </T>
        <Copy size={15} color={c.dark ? brand.gold300 : brand.gold800} />
      </Row>
    </Pressable>
  );

  return (
    <Screen onRefresh={refresh}>
      <PageHeader title={greeting} description={formatDate(today, lang)} actions={familyCode} />

      {children.data && children.data.length > 1 && (
        <View style={{ marginBottom: 18 }}>
          <ChildChips kids={children.data} value={childFilter} onChange={setChildFilter} />
        </View>
      )}

      {/* quick counters */}
      <View style={{ marginBottom: 22 }}>
        <Grid cols={L.cols(2, 4)} gap={10}>
          <QuickLink onPress={() => router.navigate('/parent/approvals')} icon={(col) => <ClipboardCheck size={24} color={col} />} label={t('dashboard.awaiting')} value={pending.data?.length} tone="purple" />
          <QuickLink onPress={() => router.navigate('/parent/initiatives')} icon={(col) => <Lightbulb size={24} color={col} />} label={t('dashboard.initiativesPending')} value={initiatives.data?.length} tone="gold" />
          <QuickLink onPress={() => router.navigate('/parent/rewards')} icon={(col) => <Gift size={24} color={col} />} label={t('rewards.unpaidTotal')} value={owed.data ? formatMoney(unpaid, family.currency, lang) : undefined} tone="pink" />
          <QuickLink onPress={() => router.navigate('/parent/notes')} icon={(col) => <ListTodo size={24} color={col} />} label={t('dashboard.followUps')} value={notes.data ? followUps.length : undefined} tone="blue" />
        </Grid>
      </View>

      {/* week progress per child */}
      <View style={{ marginBottom: 26 }}>
        <SectionTitle
          action={
            <T size={14} color={c.primaryText} onPress={() => router.navigate('/parent/week')} accessibilityRole="link">
              {t('nav.week')}
            </T>
          }
        >
          {t('dashboard.weekProgress')}
        </SectionTitle>
        {week.isError ? (
          <ErrorState message={errorMessage(week.error)} onRetry={() => void week.refetch()} />
        ) : week.isPending ? (
          <Grid cols={L.cols(1, 2)} gap={14}>
            <Skeleton height={190} />
            <Skeleton height={190} />
          </Grid>
        ) : (
          <Grid cols={L.cols(1, 2)} gap={14}>
            {visibleWeek.map((row) => (
              <ChildWeekCard key={row.child_id} row={row} levels={levels.data ?? []} />
            ))}
          </Grid>
        )}
      </View>

      {/* today */}
      <View style={{ marginBottom: 26 }}>
        <SectionTitle>{t('dashboard.overview')}</SectionTitle>
        <Grid cols={L.cols(1, 2)} gap={14}>
          {visibleChildren.map((k) => (
            <ChildTodayCard key={k.id} child={k} date={today} />
          ))}
        </Grid>
      </View>

      <Grid cols={L.cols(1, 2)} gap={16}>
        <Card style={{ gap: 12 }}>
          <Row justify="space-between">
            <T size={16} w="semibold">
              {t('dashboard.awaiting')}
            </T>
            {!!pending.data?.length && (
              <Btn size="sm" variant="soft" onPress={() => router.navigate('/parent/approvals')}>
                {t('dashboard.reviewAll')}
              </Btn>
            )}
          </Row>
          {pending.isPending ? (
            <Skeleton height={90} />
          ) : !pending.data?.length ? (
            <T size={14} color={c.muted}>
              {t('dashboard.awaitingEmpty')}
            </T>
          ) : (
            <View style={{ gap: 8 }}>
              {pending.data.slice(0, 5).map((s) => {
                const k = childMap.get(s.child_id);
                return (
                  <Row key={s.id} gap={8}>
                    {k && <ChildAvatar avatar={k.avatar} color={k.color} size="sm" />}
                    <View style={{ flex: 1 }}>
                      <T size={14}>{k?.display_name ?? ''}</T>
                    </View>
                    <T size={13} color={c.muted}>
                      {formatDate(s.for_date, lang, { weekday: 'short' })}
                    </T>
                    <T size={14} w="semibold">{`+${formatNumber(s.claimed_points, lang)}`}</T>
                  </Row>
                );
              })}
            </View>
          )}
        </Card>
        <TrendCard familyId={familyId} weekStart={weekStart} />
      </Grid>

      {followUps.length > 0 && (
        <Card style={{ marginTop: 16, gap: 10 }}>
          <T size={16} w="semibold">
            {t('dashboard.followUps')}
          </T>
          {followUps.slice(0, 6).map((n) => (
            <Row key={n.id} gap={8} align="flex-start">
              <T size={14} w="medium">{`${n.child_id ? childMap.get(n.child_id)?.display_name ?? '' : t('notes.familyWide')}:`}</T>
              <View style={{ flex: 1 }}>
                <T size={14}>{n.follow_up ?? ''}</T>
              </View>
              {!!n.follow_up_due && (
                <T size={13} color={c.muted}>
                  {formatDate(n.follow_up_due, lang, { day: 'numeric', month: 'short' })}
                </T>
              )}
            </Row>
          ))}
        </Card>
      )}
    </Screen>
  );
}

function QuickLink({ onPress, icon, label, value, tone }: { onPress: () => void; icon: (color: string) => React.ReactNode; label: string; value: React.ReactNode; tone: 'purple' | 'gold' | 'pink' | 'blue' }) {
  const { i18n } = useTranslation();
  const { c } = useTheme();
  const dir = useDir();
  const tones = {
    purple: { fg: c.dark ? brand.plum200 : brand.plum600, bg: c.dark ? 'rgba(109,63,214,0.15)' : brand.plum50 },
    gold: { fg: c.dark ? brand.gold300 : brand.gold800, bg: c.dark ? 'rgba(242,183,5,0.1)' : brand.gold50 },
    pink: { fg: brand.rose500, bg: c.dark ? 'rgba(240,90,155,0.1)' : 'rgba(253,224,238,0.6)' },
    blue: { fg: brand.sky500, bg: c.dark ? 'rgba(47,123,234,0.1)' : 'rgba(221,234,254,0.6)' },
  }[tone];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      style={({ pressed }) => ({ flexDirection: dir.row, alignItems: 'center', gap: 12, borderRadius: R.card, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: tones.bg, opacity: pressed ? 0.8 : 1, minHeight: 72 })}
    >
      {icon(tones.fg)}
      <View style={{ flex: 1, minWidth: 0 }}>
        <T size={19} w="bold" color={tones.fg} numberOfLines={1}>
          {value === undefined ? '…' : typeof value === 'number' ? formatNumber(value, i18n.language) : (value as string)}
        </T>
        <T size={12} color={tones.fg} numberOfLines={1} style={{ opacity: 0.85 }}>
          {label}
        </T>
      </View>
    </Pressable>
  );
}

function TrendCard({ familyId, weekStart }: { familyId: string; weekStart: string }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const children = useChildren(familyId);
  const snapshots = useSnapshots({ familyId, limit: 120 });
  const current = useFamilyWeek(familyId, weekStart);
  const weeks = React.useMemo(() => Array.from({ length: 8 }, (_, i) => addDays(weekStart, -7 * (7 - i))), [weekStart]);
  const series = (children.data ?? []).map((k, i) => ({
    key: k.id,
    label: k.display_name,
    color: colorHex(k.color, i),
    values: weeks.map((ws) => {
      const snap = snapshots.data?.find((s) => s.child_id === k.id && s.week_start === ws);
      const live = ws === weekStart ? current.data?.find((r) => r.child_id === k.id)?.percent ?? null : null;
      return snap?.percent != null ? Number(snap.percent) : live;
    }),
  }));
  return (
    <Card style={{ gap: 10 }}>
      <T size={16} w="semibold">
        {t('dashboard.trends')}
      </T>
      <LineChart labels={weeks.map((ws) => formatDate(ws, lang, { day: 'numeric', month: 'short' }))} series={series} />
    </Card>
  );
}
