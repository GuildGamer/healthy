import { fontSize, fontWeight, spacing } from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { DeckButton, DeckPushedPage, DeckSegmented } from '@/components/deck';
import { ScreenLoader } from '@/components/feedback';
import { apiClient } from '@/lib/api';
import { goBackOrHome } from '@/lib/go-back';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { PROGRESS_COPY } from './constants/progress-copy';
import {
  onDayFromParam,
  reportPeriodFromParam,
  reportShareHref,
  type ReportPeriod,
} from './period-report-route';
import { ProgressFactRow } from './ProgressFactRow';
import { periodReportFacts, periodReportPoster } from './period-posters';

const PERIODS: { id: ReportPeriod; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

/** Week / month / year recap: days active as the hero. Share opens a dedicated page. */
export function PeriodReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ period?: string; on?: string }>();
  const period = reportPeriodFromParam(params.period);
  const onDay = onDayFromParam(params.on);
  const styles = useThemedStyles(createStyles);
  const { colors, deckCards } = useTheme();

  const reportQuery = useQuery({
    queryKey: ['progress', 'period-report', period, onDay ?? 'today'],
    queryFn: () => apiClient.getPeriodReport(onDay ? { period, on: onDay } : { period }),
  });

  const report = reportQuery.data;
  const poster = report ? periodReportPoster(report) : null;
  const facts = report ? periodReportFacts(report) : [];

  return (
    <DeckPushedPage
      onBack={() => goBackOrHome()}
      onPullRefresh={() => reportQuery.refetch()}
      testID="period-report-screen"
      title={PROGRESS_COPY.reportTitle}
    >
      <DeckSegmented
        onSelect={(id) =>
          router.setParams({ period: id, ...(onDay ? { on: onDay } : {}) })
        }
        options={PERIODS}
        selected={period}
        testID="period-report-segments"
      />
      {reportQuery.isPending && !report ? (
        <ScreenLoader />
      ) : report && poster ? (
        <>
          <View style={styles.hero}>
            <Text style={[styles.periodLabel, { color: colors.muted }]}>{report.periodLabel}</Text>
            <Text style={[styles.value, { color: deckCards.streakTone }]}>{report.activeDays}</Text>
            <Text style={[styles.unit, { color: colors.muted }]}>
              {report.activeDays === 1 ? 'day active' : 'days active'}
            </Text>
          </View>
          <ProgressFactRow facts={facts} testID="period-report-facts" />
          <View style={styles.shareFoot}>
            <DeckButton
              glyph="share"
              label={PROGRESS_COPY.share}
              onPress={() => router.push(reportShareHref({ period, onDay }) as Href)}
              testID="period-report-share"
            />
          </View>
        </>
      ) : (
        <Text style={[styles.failed, { color: colors.muted }]}>{PROGRESS_COPY.reportFailed}</Text>
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
