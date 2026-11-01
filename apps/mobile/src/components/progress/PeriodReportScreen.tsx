import { fontSize, fontWeight, spacing } from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { DeckButton, DeckPushedPage, DeckSegmented } from '@/components/deck';
import { SharePosterCard } from '@/components/challenges/SharePosterCard';
import { ScreenLoader } from '@/components/feedback';
import { apiClient } from '@/lib/api';
import { goBackOrHome } from '@/lib/go-back';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { PROGRESS_COPY } from './constants/progress-copy';
import { ProgressFactRow } from './ProgressFactRow';
import {
  periodReportFacts,
  periodReportPoster,
  periodReportRunLine,
  periodReportShareText,
} from './period-posters';
import { useSharePoster } from './useSharePoster';

type ReportPeriod = 'week' | 'month' | 'year';

const PERIODS: { id: ReportPeriod; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function periodFromParam(value: string | string[] | undefined): ReportPeriod {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'month' || raw === 'year') {
    return raw;
  }
  return 'week';
}

/** The closed day a recap email named. Absent means the member's today. */
function onDayFromParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && DAY_KEY_PATTERN.test(raw)) {
    return raw;
  }
  return undefined;
}

/** Week / month / year recap: days active as the hero, Share as the primary. */
export function PeriodReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ period?: string; on?: string }>();
  const period = periodFromParam(params.period);
  const onDay = onDayFromParam(params.on);
  const styles = useThemedStyles(createStyles);
  const { colors, deckCards } = useTheme();

  const reportQuery = useQuery({
    queryKey: ['progress', 'period-report', period, onDay ?? 'today'],
    queryFn: () => apiClient.getPeriodReport(onDay ? { period, on: onDay } : { period }),
  });

  const report = reportQuery.data;
  const poster = report ? periodReportPoster(report) : null;
  const runLine = report ? periodReportRunLine(report) : null;
  const facts = report ? periodReportFacts(report) : [];
  const share = useSharePoster(
    report ? periodReportShareText(report) : PROGRESS_COPY.shareFallback,
    'period_report',
  );

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
          <DeckButton
            glyph="share"
            label={PROGRESS_COPY.share}
            loading={share.isSharing}
            onPress={() => void share.share()}
            testID="period-report-share"
          />
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
