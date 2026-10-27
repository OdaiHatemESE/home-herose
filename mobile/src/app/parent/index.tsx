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
import type { LucideIcon } from 'lucide-react-native';
import { useFamilyTable, useNotes } from '@/api/content';
import { useChildren } from '@/api/family';
import { useInitiatives } from '@/api/initiatives';
import { useFamilyWeek, usePendingSubmissions, useSnapshots } from '@/api/progress';
import { useFulfillments } from '@/api/rewards';
import { useParent } from '@/auth/AuthProvider';
import { ChildAvatar } from '@/components/brand';
import { LineChart } from '@/components/LineChart';
import { KidCard, KidToday, KidWeek, useChildMap } from '@/components/parent';
import { toast } from '@/components/toast';
import { Btn, Card, EmptyState, ErrorState, Grid, Row, Screen, Skeleton, T } from '@/components/ui';
import { useDir } from '@/i18n';
import { colorHex } from '@/lib/chartColors';
import { addDays, formatDate, formatMoney, formatNumber, weekStartFor } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { useLayout } from '@/lib/layout';
import { brand, R, useTheme } from '@/lib/theme';

export default function ParentHome() {
  const { t, i18n } = useTranslation();
  const { c } = useTheme();
  const L = useLayout();
  const dir = useDir();
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
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const rows = week.data ?? [];
  const selected = rows.find((r) => r.child_id === selectedId) ?? rows[0];
  const selectedChild = selected ? childMap.get(selected.child_id) : undefined;
  const followUps = (notes.data ?? []).filter((n) => n.follow_up && !n.follow_up_done && (!n.follow_up_due || n.follow_up_due <= today));
  const unpaid = (owed.data ?? []).filter((f) => f.payment_status === 'unpaid' && f.status !== 'cancelled').reduce((s, f) => s + Number(f.amount ?? 0), 0);
  const name = profile?.display_name ?? membership.display_name ?? '';
  const refresh = () => qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'identity' });

  if (children.data && children.data.length === 0) {
    return (
      <Screen onRefresh={refresh}>
        <View style={{ gap: 20 }}>
          <Greeting name={name} date={formatDate(today, lang)} />
          <EmptyState
            icon="🏆"
            title={t('dashboard.noChildren')}
            action={
              <Btn onPress={() => router.navigate('/parent/family')} icon={(col, s) => <UserPlus size={s} color={col} />}>
                {t('dashboard.addChildren')}
              </Btn>
            }
          />
        </View>
      </Screen>
    );
  }

  const header = (
    <Row justify="space-between" align="center" wrap gap={12}>
      <Greeting name={name} date={formatDate(today, lang)} />
      <FamilyCode code={family.family_code} />
    </Row>
  );

  const summary = (
    <Grid cols={L.wide ? 2 : L.tablet ? 4 : 2} gap={10}>
      <SummaryTile onPress={() => router.navigate('/parent/approvals')} icon={ClipboardCheck} label={t('dashboard.awaiting')} value={pending.data?.length} tone="purple" />
      <SummaryTile onPress={() => router.navigate('/parent/initiatives')} icon={Lightbulb} label={t('dashboard.initiativesPending')} value={initiatives.data?.length} tone="gold" />
      <SummaryTile onPress={() => router.navigate('/parent/rewards')} icon={Gift} label={t('rewards.unpaidTotal')} value={owed.data ? formatMoney(unpaid, family.currency, lang) : undefined} tone="pink" />
      <SummaryTile onPress={() => router.navigate('/parent/notes')} icon={ListTodo} label={t('dashboard.followUps')} value={notes.data ? followUps.length : undefined} tone="blue" />
    </Grid>
  );

  const heroes = (
    <View style={{ gap: 12 }}>
      <T size={19} w="bold" accessibilityRole="header">
        {t('mobile.kids')}
      </T>
      {week.isError ? (
        <ErrorState message={errorMessage(week.error)} onRetry={() => void week.refetch()} />
      ) : week.isPending ? (
        <Grid cols={L.wide ? 2 : L.tablet ? 4 : 2} gap={10}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={170} />
          ))}
        </Grid>
      ) : (
        <View accessibilityRole="radiogroup">
          <Grid cols={L.wide ? 2 : L.tablet ? Math.min(Math.max(rows.length, 2), 4) : 2} gap={10}>
            {rows.map((r) => (
              <KidCard key={r.child_id} row={r} selected={r.child_id === selected?.child_id} onPress={() => setSelectedId(r.child_id)} compact={!L.tablet} />
            ))}
          </Grid>
        </View>
      )}
    </View>
  );

  const panel =
    selected && selectedChild ? (
      <Card style={{ padding: L.tablet ? 22 : 16, borderRadius: R.hero, gap: 22 }}>
        <KidWeek row={selected} levels={levels.data ?? []} />
        <KidToday child={selectedChild} date={today} />
      </Card>
    ) : null;

  const awaiting = (
    <Card style={{ gap: 12, borderRadius: R.hero }}>
      <Row justify="space-between">
        <T size={17} w="bold">
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
        <View style={{ gap: 10 }}>
          {pending.data.slice(0, 5).map((s) => {
            const k = childMap.get(s.child_id);
            return (
              <Row key={s.id} gap={10}>
                {k && <ChildAvatar avatar={k.avatar} color={k.color} size="sm" />}
                <View style={{ flex: 1 }}>
                  <T size={14.5}>{k?.display_name ?? ''}</T>
                </View>
                <T size={13} color={c.muted}>
                  {formatDate(s.for_date, lang, { weekday: 'short' })}
                </T>
                <T size={14.5} w="bold">{`+${formatNumber(s.claimed_points, lang)}`}</T>
              </Row>
            );
          })}
        </View>
      )}
    </Card>
  );

  const followUpsCard =
    followUps.length > 0 ? (
      <Card style={{ gap: 10, borderRadius: R.hero }}>
        <T size={17} w="bold">
          {t('dashboard.followUps')}
        </T>
        {followUps.slice(0, 6).map((n) => (
          <Row key={n.id} gap={8} align="flex-start">
            <T size={14} w="medium">{`${n.child_id ? childMap.get(n.child_id)?.display_name ?? '' : t('notes.familyWide')}:`}</T>
            <View style={{ flex: 1 }}>
              <T size={14}>{n.follow_up ?? ''}</T>
            </View>
          </Row>
        ))}
      </Card>
    ) : null;

  const trend = <TrendCard familyId={familyId} weekStart={weekStart} />;

  // Tablet landscape: overview on one side, the selected hero on the other (master–detail).
  if (L.wide) {
    return (
      <Screen onRefresh={refresh} maxWidth={1400}>
        <View style={{ gap: 22 }}>
          {header}
          <View style={{ flexDirection: dir.row, gap: 22, alignItems: 'flex-start' }}>
            <View style={{ width: 380, gap: 22 }}>
              {summary}
              {heroes}
              {awaiting}
              {followUpsCard}
            </View>
            <View style={{ flex: 1, gap: 22 }}>
              {panel}
              {trend}
            </View>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen onRefresh={refresh}>
      <View style={{ gap: L.tablet ? 26 : 20 }}>
        {header}
        {summary}
        {heroes}
        {panel}
        <Grid cols={L.cols(1, 2)} gap={16}>
          {awaiting}
          {trend}
        </Grid>
        {followUpsCard}
      </View>
    </Screen>
  );
}

function Greeting({ name, date }: { name: string; date: string }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const L = useLayout();
  return (
    <View style={{ flexShrink: 1 }}>
      <T size={L.tablet ? 30 : 25} w="bold" accessibilityRole="header">
        {`${t('dashboard.greeting', { name })} 👋`}
      </T>
      <T size={14.5} color={c.muted}>
        {date}
      </T>
    </View>
  );
}

function FamilyCode({ code }: { code: string }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const fg = c.dark ? brand.gold300 : brand.gold800;
  return (
    <Pressable
      onPress={() => void Clipboard.setStringAsync(code).then(() => toast.success(t('common.copied')))}
      accessibilityRole="button"
      accessibilityLabel={`${t('dashboard.familyCode')} ${code}`}
      android_ripple={{ color: 'rgba(242,183,5,0.25)' }}
      style={{ borderRadius: R.card, backgroundColor: c.dark ? 'rgba(242,183,5,0.14)' : brand.gold100, paddingHorizontal: 14, paddingVertical: 8, gap: 2 }}
    >
      <T size={11.5} color={fg}>
        {t('auth.familyCode')}
      </T>
      <Row gap={8}>
        <T size={18} w="bold" ltr color={fg} style={{ letterSpacing: 3 }}>
          {code}
        </T>
        <Copy size={16} color={fg} />
      </Row>
    </Pressable>
  );
}

function SummaryTile({ onPress, icon: Icon, label, value, tone }: { onPress: () => void; icon: LucideIcon; label: string; value: React.ReactNode; tone: 'purple' | 'gold' | 'pink' | 'blue' }) {
  const { i18n } = useTranslation();
  const { c } = useTheme();
  const dir = useDir();
  const tones = {
    purple: { fg: c.dark ? brand.plum200 : brand.plum600, bg: c.dark ? 'rgba(109,63,214,0.18)' : brand.plum50, chip: c.dark ? 'rgba(154,118,240,0.25)' : brand.plum100 },
    gold: { fg: c.dark ? brand.gold300 : brand.gold800, bg: c.dark ? 'rgba(242,183,5,0.12)' : brand.gold50, chip: c.dark ? 'rgba(242,183,5,0.2)' : brand.gold100 },
    pink: { fg: brand.rose500, bg: c.dark ? 'rgba(240,90,155,0.12)' : '#FFF1F7', chip: c.dark ? 'rgba(240,90,155,0.22)' : brand.rose100 },
    blue: { fg: brand.sky500, bg: c.dark ? 'rgba(47,123,234,0.12)' : '#F0F6FF', chip: c.dark ? 'rgba(47,123,234,0.22)' : brand.sky100 },
  }[tone];
  const L = useLayout();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
      style={({ pressed }) => ({
        borderRadius: R.card,
        padding: L.tablet ? 14 : 12,
        backgroundColor: tones.bg,
        opacity: pressed ? 0.85 : 1,
        gap: 10,
        minHeight: L.tablet ? 112 : 72,
        flexDirection: L.tablet ? 'column' : dir.row,
        alignItems: L.tablet ? 'stretch' : 'center',
      })}
    >
      <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: tones.chip, alignItems: 'center', justifyContent: 'center', alignSelf: L.tablet ? dir.alignStart : 'center' }}>
        <Icon size={20} color={tones.fg} />
      </View>
      <View style={{ flex: L.tablet ? undefined : 1, minWidth: 0 }}>
        <T size={22} w="bold" color={tones.fg} numberOfLines={1}>
          {value === undefined ? '…' : typeof value === 'number' ? formatNumber(value, i18n.language) : (value as string)}
        </T>
        <T size={12.5} color={c.dark ? c.muted : tones.fg} numberOfLines={2}>
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
    <Card style={{ gap: 10, borderRadius: R.hero }}>
      <T size={17} w="bold">
        {t('dashboard.trends')}
      </T>
      <LineChart labels={weeks.map((ws) => formatDate(ws, lang, { day: 'numeric', month: 'short' }))} series={series} />
    </Card>
  );
}
