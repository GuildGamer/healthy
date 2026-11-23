import type { DeviceMetric } from '@product/client';
import { fontSize, fontWeight, spacing } from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHARE_COPY } from '@/components/challenges/constants/doing-copy';
import { defaultShareFillId, type ShareFillId } from '@/components/challenges/share-fill';
import { ShareFillCarousel } from '@/components/challenges/ShareFillCarousel';
import { SharePosterCard } from '@/components/challenges/SharePosterCard';
import { DeckNavButton } from '@/components/deck';
import { ScreenLoader } from '@/components/feedback';
import { ShareCapture, ShareDestinationRow, useShareDestinations } from '@/components/share';
import { apiClient } from '@/lib/api';
import { goBackOrHome } from '@/lib/go-back';
import { type Theme, useThemedStyles } from '@/theme';
import { PROGRESS_COPY } from './constants/progress-copy';
import { openFriendChallenge, type StatsPeriod } from './metric-stats-route';
import {
  metricPeriodPoster,
  metricPeriodRunLine,
  metricPeriodShareText,
} from './period-posters';

/** Poster + colour + destinations for one metric period total. */
export function MetricShareScreen({
  metric,
  period,
}: {
  metric: DeviceMetric;
  period: StatsPeriod;
}) {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [fillId, setFillId] = useState<ShareFillId | null>(null);

  const statsQuery = useQuery({
    queryKey: ['progress', 'metric-stats', metric, period],
    queryFn: () => apiClient.getMetricPeriodStats({ metric, period }),
  });

  const stats = statsQuery.data;
  const poster = stats ? metricPeriodPoster(stats) : null;
  const runLine = stats ? metricPeriodRunLine(stats) : null;
  const friendRoute = openFriendChallenge(metric);
  const selectedFill = fillId ?? (poster ? defaultShareFillId(poster.kind) : 'walk');
  const destinations = useShareDestinations({
    buildPayload: () => ({
      caption: stats ? metricPeriodShareText(stats) : PROGRESS_COPY.shareFallback,
      artifact: { kind: 'image' },
    }),
    onChallenge: friendRoute ? () => router.push(friendRoute) : undefined,
  });

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.md },
      ]}
      testID="metric-share-screen"
    >
      <View style={styles.nav}>
        <DeckNavButton
          accessibilityLabel={SHARE_COPY.close}
          glyph="close"
          onPress={() => goBackOrHome()}
          testID="metric-share-close"
        />
        <Text style={styles.navTitle}>{SHARE_COPY.title}</Text>
        <View style={styles.navSpacer} />
      </View>
      {statsQuery.isPending && !stats ? (
        <ScreenLoader />
      ) : stats && poster ? (
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
            <ShareDestinationRow
              disabled={destinations.isBusy}
              onSelect={destinations.select}
              showChallenge={friendRoute != null}
              showCopy={false}
            />
          </View>
        </>
      ) : (
        <Text style={styles.failed}>{PROGRESS_COPY.statsFailed}</Text>
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
