import { fontSize, fontWeight, spacing } from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DeckPushedPage, DeckSegmented } from '@/components/deck';
import { defaultShareFillId, type ShareFillId } from '@/components/challenges/share-fill';
import { ShareFillCarousel } from '@/components/challenges/ShareFillCarousel';
import { SharePosterCard } from '@/components/challenges/SharePosterCard';
import { ScreenLoader } from '@/components/feedback';
import { ShareCapture, ShareDestinationRow, useShareDestinations } from '@/components/share';
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

/** Week / month / year recap: days active as the hero, destinations as the primary. */
export function PeriodReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ period?: string; on?: string }>();
  const period = periodFromParam(params.period);
  const onDay = onDayFromParam(params.on);
  const styles = useThemedStyles(createStyles);
  const { colors, deckCards } = useTheme();
  const [fillId, setFillId] = useState<ShareFillId | null>(null);

  const reportQuery = useQuery({
    queryKey: ['progress', 'period-report', period, onDay ?? 'today'],
    queryFn: () => apiClient.getPeriodReport(onDay ? { period, on: onDay } : { period }),
  });

  const report = reportQuery.data;
  const poster = report ? periodReportPoster(report) : null;
  const runLine = report ? periodReportRunLine(report) : null;
  const facts = report ? periodReportFacts(report) : [];
  const selectedFill = fillId ?? (poster ? defaultShareFillId(poster.kind) : 'streak');
  const destinations = useShareDestinations({
    buildPayload: () => ({
      caption: report ? periodReportShareText(report) : PROGRESS_COPY.shareFallback,
      artifact: { kind: 'image' },
    }),
  });

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
          <ShareCapture shotRef={destinations.shotRef}>
            {(corners) => (
              <View style={styles.posterWrap}>
                <SharePosterCard
                  corners={corners}
                  fillId={selectedFill}
                  poster={poster}
                  runLine={runLine}
                  testID={
                    corners === 'round' ? 'share-poster-image' : 'share-poster-image-capture'
                  }
                />
              </View>
            )}
          </ShareCapture>
          <View style={styles.shareBlock} testID="period-report-share">
            <ShareFillCarousel onSelect={setFillId} selected={selectedFill} />
            <ShareDestinationRow
              disabled={destinations.isBusy}
              onSelect={destinations.select}
              showCopy={false}
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
    posterWrap: {
      alignSelf: 'center',
      marginTop: spacing.lg,
    },
    shareBlock: {
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    failed: {
      marginTop: spacing.xl,
      fontSize: fontSize.sm,
    },
  });
