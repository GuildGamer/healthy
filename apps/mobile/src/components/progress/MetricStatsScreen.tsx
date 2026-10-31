import type { DeviceMetric, MatchMetric } from '@product/client';
import { fontSize, fontWeight, spacing } from '@product/brand';
import { matchMetricSchema } from '@product/contract/match-board';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { DeckButton, DeckPushedPage, DeckSegmented } from '@/components/deck';
import { DECK_KIND_BY_METRIC } from '@/components/deck';
import { FRIEND_CHALLENGE_COPY } from '@/components/challenges/constants/friend-challenge';
import { SharePosterCard } from '@/components/challenges/SharePosterCard';
import { ScreenLoader } from '@/components/feedback';
import { MATCH_METRIC_LABEL } from '@/components/matches/match-metric';
import { apiClient } from '@/lib/api';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { PROGRESS_COPY } from './constants/progress-copy';
import { ProgressFactRow } from './ProgressFactRow';
import {
  metricPeriodFacts,
  metricPeriodPoster,
  metricPeriodRunLine,
  metricPeriodShareText,
} from './period-posters';
import { useSharePoster } from './useSharePoster';

type StatsPeriod = 'week' | 'month' | 'all';

const PERIODS: { id: StatsPeriod; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'all', label: 'All time' },
];

const STATS_METRICS = new Set<string>([
  'pushups',
  'squats',
  'plank',
  'jumping_jacks',
  'burpees',
  'sit_ups',
  'mountain_climbers',
  'lunges',
  'walk',
]);

function metricFromParam(value: string | string[] | undefined): DeviceMetric | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !STATS_METRICS.has(raw)) {
    return null;
  }
  return raw as DeviceMetric;
}

function periodFromParam(value: string | string[] | undefined): StatsPeriod {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'month' || raw === 'all') {
    return raw;
  }
  return 'week';
}

function titleFor(metric: DeviceMetric): string {
  return metric in MATCH_METRIC_LABEL
    ? MATCH_METRIC_LABEL[metric as MatchMetric]
    : metric;
}

function openFriendChallenge(metric: DeviceMetric): { pathname: '/matches/create'; params: { metric: string } } | null {
  const parsed = matchMetricSchema.safeParse(metric);
  if (!parsed.success) {
    return null;
  }
  return {
    pathname: '/matches/create',
    params: { metric: parsed.data },
  };
}

/** One metric's week / month / all-time total with a Share poster. */
export function MetricStatsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ metric?: string; period?: string }>();
  const metric = metricFromParam(params.metric);
  const period = periodFromParam(params.period);
  const styles = useThemedStyles(createStyles);
  const { colors, deckCards } = useTheme();

  const statsQuery = useQuery({
    queryKey: ['progress', 'metric-stats', metric, period],
    queryFn: () => apiClient.getMetricPeriodStats({ metric: metric!, period }),
    enabled: metric !== null,
  });

  const stats = statsQuery.data;
  const poster = stats ? metricPeriodPoster(stats) : null;
  const runLine = stats ? metricPeriodRunLine(stats) : null;
  const facts = stats ? metricPeriodFacts(stats) : [];
  const share = useSharePoster(
    stats ? metricPeriodShareText(stats) : PROGRESS_COPY.shareFallback,
    'metric_stats',
  );
  const friendRoute = metric ? openFriendChallenge(metric) : null;

  if (!metric) {
    return (
      <DeckPushedPage
        onBack={() => router.back()}
        onPullRefresh={async () => undefined}
        title={PROGRESS_COPY.statsTitle}
      >
        <Text style={{ color: colors.muted }}>{PROGRESS_COPY.statsUnknown}</Text>
      </DeckPushedPage>
    );
  }

  const tone = deckCards.tones[DECK_KIND_BY_METRIC[metric] ?? 'walk'];

  return (
    <DeckPushedPage
      onBack={() => router.back()}
      onPullRefresh={() => statsQuery.refetch()}
      testID="metric-stats-screen"
      title={titleFor(metric)}
    >
      <DeckSegmented
        onSelect={(id) => router.setParams({ period: id })}
        options={PERIODS}
        selected={period}
        testID="metric-stats-segments"
      />
      {statsQuery.isPending && !stats ? (
        <ScreenLoader />
      ) : stats && poster ? (
        <>
          <View style={styles.hero}>
            <Text style={[styles.periodLabel, { color: colors.muted }]}>{stats.periodLabel}</Text>
            <Text style={[styles.value, { color: tone }]}>{poster.value}</Text>
            <Text style={[styles.unit, { color: colors.muted }]}>{stats.unit}</Text>
          </View>
          <ProgressFactRow facts={facts} testID="metric-stats-facts" />
          <DeckButton
            glyph="share"
            label={PROGRESS_COPY.share}
            loading={share.isSharing}
            onPress={() => void share.share()}
            testID="metric-stats-share"
          />
          {friendRoute ? (
            <DeckButton
              label={FRIEND_CHALLENGE_COPY.action}
              onPress={() => router.push(friendRoute)}
              testID="metric-stats-challenge-friend"
              variant="quiet"
            />
          ) : null}
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            pointerEvents="none"
            style={styles.offscreen}
          >
            <View collapsable={false} ref={share.shotRef}>
              <SharePosterCard poster={poster} runLine={runLine} />
            </View>
          </View>
        </>
      ) : (
        <Text style={[styles.failed, { color: colors.muted }]}>{PROGRESS_COPY.statsFailed}</Text>
      )}
    </DeckPushedPage>
  );
}

const createStyles = (_theme: Theme) =>
  StyleSheet.create({
    hero: {
      marginTop: spacing.xl,
      marginBottom: spacing.lg,
      gap: spacing.sm,
    },
    periodLabel: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
    },
    value: {
      fontSize: 72,
      fontWeight: fontWeight.semibold,
      letterSpacing: -2,
      lineHeight: 76,
    },
    unit: {
      fontSize: 17,
      fontWeight: fontWeight.medium,
    },
    failed: {
      marginTop: spacing.xl,
      fontSize: fontSize.sm,
    },
    offscreen: {
      position: 'absolute',
      left: -4000,
      top: 0,
    },
  });
