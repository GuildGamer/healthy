import type { CatalogChallenge, DeviceMetric, MatchMetric } from '@product/client';
import { MATCH_METRIC_LABEL } from '@/components/matches/match-metric';

const STATS_ORDER: MatchMetric[] = [
  'pushups',
  'squats',
  'plank',
  'jumping_jacks',
  'burpees',
  'sit_ups',
  'mountain_climbers',
  'lunges',
  'walk',
];

/**
 * Enrolled challenges that measure a shareable metric, one row per metric so
 * You never lists the same exercise twice.
 */
export function enrolledStatsMetrics(
  challenges: readonly CatalogChallenge[],
): { metric: DeviceMetric; title: string }[] {
  const seen = new Set<string>();
  const found: { metric: DeviceMetric; title: string }[] = [];

  for (const challenge of challenges) {
    if (!challenge.isEnrolled) {
      continue;
    }
    const metric = challenge.capture?.metric;
    if (!metric || !(metric in MATCH_METRIC_LABEL) || seen.has(metric)) {
      continue;
    }
    seen.add(metric);
    found.push({ metric, title: MATCH_METRIC_LABEL[metric as MatchMetric] });
  }

  return STATS_ORDER.filter((metric) => seen.has(metric)).map((metric) => ({
    metric,
    title: MATCH_METRIC_LABEL[metric],
  }));
}
