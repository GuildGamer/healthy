import { fontSize, fontWeight, spacing } from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHARE_COPY } from '@/components/challenges/constants/doing-copy';
import { defaultShareFillId, type ShareFillId } from '@/components/challenges/share-fill';
import { ShareFillCarousel } from '@/components/challenges/ShareFillCarousel';
import { SharePosterCard } from '@/components/challenges/SharePosterCard';
import { DeckButton, DeckNavButton } from '@/components/deck';
import { ScreenLoader } from '@/components/feedback';
import type { SharePayload } from '@/components/matches/share-destination';
import {
  ShareCapture,
  ShareDestinationSheet,
  useShareDestinations,
} from '@/components/share';
import { apiClient } from '@/lib/api';
import { goBackOrHome } from '@/lib/go-back';
import { type Theme, useThemedStyles } from '@/theme';
import { PROGRESS_COPY } from './constants/progress-copy';
import type { ReportPeriod } from './period-report-route';
import {
  periodReportPoster,
  periodReportRunLine,
  periodReportShareText,
} from './period-posters';

/** Poster + colour + Share → destination sheet for a week / month / year recap. */
export function PeriodShareScreen({
  period,
  onDay,
}: {
  period: ReportPeriod;
  onDay?: string;
}) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [fillId, setFillId] = useState<ShareFillId | null>(null);
  const [sheetPayload, setSheetPayload] = useState<SharePayload | null>(null);

  const reportQuery = useQuery({
    queryKey: ['progress', 'period-report', period, onDay ?? 'today'],
    queryFn: () => apiClient.getPeriodReport(onDay ? { period, on: onDay } : { period }),
  });

  const report = reportQuery.data;
  const poster = report ? periodReportPoster(report) : null;
  const runLine = report ? periodReportRunLine(report) : null;
  const selectedFill = fillId ?? (poster ? defaultShareFillId(poster.kind) : 'streak');
  const destinations = useShareDestinations({
    buildPayload: () => ({
      caption: report ? periodReportShareText(report) : PROGRESS_COPY.shareFallback,
      artifact: { kind: 'image' },
    }),
  });

  async function onSharePress() {
    if (destinations.isBusy) {
      return;
    }
    const payload = await destinations.preparePayload();
    if (!payload) {
      return;
    }
    setSheetPayload(payload);
  }

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.md },
      ]}
      testID="period-share-screen"
    >
      <View style={styles.nav}>
        <DeckNavButton
          accessibilityLabel={SHARE_COPY.close}
          glyph="close"
          onPress={() => goBackOrHome()}
          testID="period-share-close"
        />
        <Text style={styles.navTitle}>{SHARE_COPY.title}</Text>
        <View style={styles.navSpacer} />
      </View>
      {reportQuery.isPending && !report ? (
        <ScreenLoader />
      ) : report && poster ? (
        <>
          <ShareCapture shotRef={destinations.shotRef}>
            {(corners) =>
              corners === 'round' ? (
                <View style={styles.posterWrap}>
                  <SharePosterCard
                    corners={corners}
                    fillId={selectedFill}
                    poster={poster}
                    runLine={runLine}
                  />
                </View>
              ) : (
                <SharePosterCard
                  corners={corners}
                  fillId={selectedFill}
                  poster={poster}
                  runLine={runLine}
                  testID="share-poster-image-capture"
                />
              )
            }
          </ShareCapture>
          <View style={styles.actions}>
            <ShareFillCarousel onSelect={setFillId} selected={selectedFill} />
            <DeckButton
              disabled={destinations.isBusy}
              label={SHARE_COPY.share}
              onPress={() => void onSharePress()}
              testID="period-share-open"
            />
          </View>
          {sheetPayload ? (
            <ShareDestinationSheet
              onClose={() => setSheetPayload(null)}
              payload={sheetPayload}
              showCopy={false}
              visible
            />
          ) : null}
        </>
      ) : (
        <Text style={styles.failed}>{PROGRESS_COPY.reportFailed}</Text>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingHorizontal: 20,
    },
    nav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    navTitle: {
      color: theme.colors.text,
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
    },
    navSpacer: {
      width: 40,
    },
    posterWrap: {
      alignSelf: 'center',
      marginTop: 18,
    },
    actions: {
      marginTop: 'auto',
      gap: spacing.sm,
    },
    failed: {
      marginTop: spacing.xl,
      color: theme.colors.muted,
      fontSize: fontSize.sm,
    },
  });
