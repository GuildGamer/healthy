import type { DeviceMetric, MatchMetric } from '@product/client';
import { matchMetricSchema } from '@product/contract/match-board';
import { MATCH_METRIC_LABEL } from '@/components/matches/match-metric';

export type StatsPeriod = 'week' | 'month' | 'all';

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

export function metricFromParam(value: string | string[] | undefined): DeviceMetric | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !STATS_METRICS.has(raw)) {
    return null;
  }
  return raw as DeviceMetric;
}

export function statsPeriodFromParam(value: string | string[] | undefined): StatsPeriod {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'month' || raw === 'all') {
    return raw;
  }
  return 'week';
}

export function titleForMetric(metric: DeviceMetric): string {
  return metric in MATCH_METRIC_LABEL
    ? MATCH_METRIC_LABEL[metric as MatchMetric]
    : metric;
}

export function openFriendChallenge(
  metric: DeviceMetric,
): { pathname: '/matches/create'; params: { metric: string } } | null {
  const parsed = matchMetricSchema.safeParse(metric);
  if (!parsed.success) {
    return null;
  }
  return {
    pathname: '/matches/create',
    params: { metric: parsed.data },
  };
}

/** Query string for `/share/metric`. */
export function metricShareHref(input: {
  metric: DeviceMetric;
  period: StatsPeriod;
}): string {
  return `/share/metric?metric=${encodeURIComponent(input.metric)}&period=${encodeURIComponent(input.period)}`;
}
