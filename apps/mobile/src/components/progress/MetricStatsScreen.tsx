import { fontSize, fontWeight, spacing } from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { DeckButton, DeckPushedPage, DeckSegmented } from '@/components/deck';
import { DECK_KIND_BY_METRIC } from '@/components/deck';
import { ScreenLoader } from '@/components/feedback';
import { apiClient } from '@/lib/api';
import { goBackOrHome } from '@/lib/go-back';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { PROGRESS_COPY } from './constants/progress-copy';
import {
  metricFromParam,
  metricShareHref,
  statsPeriodFromParam,
  titleForMetric,
  type StatsPeriod,
} from './metric-stats-route';
import { ProgressFactRow } from './ProgressFactRow';
import { metricPeriodFacts, metricPeriodPoster } from './period-posters';

const PERIODS: { id: StatsPeriod; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'all', label: 'All time' },
];

/** One metric's week / month / all-time total. Share opens a dedicated page. */
export function MetricStatsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ metric?: string; period?: string }>();
  const metric = metricFromParam(params.metric);
  const period = statsPeriodFromParam(params.period);
  const styles = useThemedStyles(createStyles);
  const { colors, deckCards } = useTheme();

  const statsQuery = useQuery({
    queryKey: ['progress', 'metric-stats', metric, period],
    queryFn: () => apiClient.getMetricPeriodStats({ metric: metric!, period }),
    enabled: metric !== null,
  });

  const stats = statsQuery.data;
  const poster = stats ? metricPeriodPoster(stats) : null;
  const facts = stats ? metricPeriodFacts(stats) : [];

  if (!metric) {
    return (
      <DeckPushedPage
        onBack={() => goBackOrHome('/progress/reports')}
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
      onBack={() => goBackOrHome('/progress/reports')}
      onPullRefresh={() => statsQuery.refetch()}
      testID="metric-stats-screen"
      title={titleForMetric(metric)}
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
          <View style={styles.shareFoot}>
            <DeckButton
              glyph="share"
              label={PROGRESS_COPY.share}
              onPress={() => router.push(metricShareHref({ metric, period }) as Href)}
              testID="metric-stats-share"
            />
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
    shareFoot: {
      marginTop: spacing.xl,
    },
    failed: {
      marginTop: spacing.xl,
      fontSize: fontSize.sm,
    },
  });
