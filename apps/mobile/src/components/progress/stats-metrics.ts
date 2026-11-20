import type { CatalogChallenge, DeviceMetric, MatchMetric } from '@product/client';
import { REPORT_STATS_METRICS, matchMetricSchema } from '@product/contract/match-board';
import { MATCH_METRIC_LABEL } from '@/components/matches/match-metric';

/**
 * Enrolled challenges that measure a shareable metric, one row per metric so
 * You never lists the same exercise twice.
 */
export function enrolledStatsMetrics(
  challenges: readonly CatalogChallenge[],
): { metric: DeviceMetric; title: string }[] {
  const seen = new Set<MatchMetric>();

  for (const challenge of challenges) {
    if (!challenge.isEnrolled) {
      continue;
    }

    const parsed = matchMetricSchema.safeParse(challenge.capture?.metric);
    if (!parsed.success || seen.has(parsed.data)) {
      continue;
    }

    seen.add(parsed.data);
  }

  return REPORT_STATS_METRICS.filter((metric) => seen.has(metric)).map((metric) => ({
    metric,
    title: MATCH_METRIC_LABEL[metric],
  }));
}
