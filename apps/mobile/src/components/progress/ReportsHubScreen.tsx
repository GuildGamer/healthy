import { useQuery } from '@tanstack/react-query';
import { type Href, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { DeckDisc, DeckListRow, DeckPushedPage } from '@/components/deck';
import { DECK_KIND_BY_METRIC, DECK_KIND_GLYPH } from '@/components/deck';
import { ScreenLoader } from '@/components/feedback';
import { apiClient } from '@/lib/api';
import { PROGRESS_COPY } from './constants/progress-copy';
import { enrolledStatsMetrics } from './stats-metrics';

/**
 * One place to pick what to look at: a period recap, or any enrolled workout.
 * Period and metric detail screens keep their own week / month / year controls.
 */
export function ReportsHubScreen() {
  const router = useRouter();
  const catalogQuery = useQuery({
    queryKey: ['challenges', 'catalog'],
    queryFn: () => apiClient.listChallengeCatalog(),
  });
  const metrics = enrolledStatsMetrics(catalogQuery.data?.challenges ?? []);

  return (
    <DeckPushedPage
      onBack={() => router.back()}
      onPullRefresh={() => catalogQuery.refetch()}
      testID="reports-hub-screen"
      title={PROGRESS_COPY.reportsTitle}
    >
      {catalogQuery.isPending && !catalogQuery.data ? (
        <ScreenLoader />
      ) : (
        <View style={styles.list}>
          <DeckListRow
            isFirst
            leading={<DeckDisc glyph="flame" />}
            meta={PROGRESS_COPY.periodOverviewMeta}
            onPress={() => router.push('/progress/report?period=week' as Href)}
            testID="reports-open-period"
            title={PROGRESS_COPY.periodOverviewTitle}
          />
          {metrics.map((row) => {
            const kind = DECK_KIND_BY_METRIC[row.metric as keyof typeof DECK_KIND_BY_METRIC] ?? 'walk';
            return (
              <DeckListRow
                key={row.metric}
                leading={<DeckDisc glyph={DECK_KIND_GLYPH[kind]} />}
                meta={PROGRESS_COPY.activityStatsMeta}
                onPress={() =>
                  router.push(`/progress/metric/${row.metric}?period=week` as Href)
                }
                testID={`reports-open-metric-${row.metric}`}
                title={row.title}
              />
            );
          })}
        </View>
      )}
    </DeckPushedPage>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: 8,
  },
});
