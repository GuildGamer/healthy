import type { MatchMetric, MetricPeriodStats, PeriodReport } from '@product/client';
import { DECK_KIND_BY_METRIC } from '@/components/deck';
import type { SharePoster, SharePosterFact } from '@/components/challenges/types/share-poster';
import { MATCH_METRIC_LABEL } from '@/components/matches/match-metric';
import type { ProgressFact } from './ProgressFactRow';

function isMatchMetric(metric: string): metric is MatchMetric {
  return metric in MATCH_METRIC_LABEL;
}

function formatCount(count: number): string {
  if (count >= 10_000) {
    return `${(count / 1000).toFixed(count >= 100_000 ? 0 : 1).replace(/\.0$/, '')}k`;
  }
  return count.toLocaleString('en-US');
}

function highlightLine(report: PeriodReport): string | null {
  if (!report.highlight) {
    return null;
  }
  return `${formatCount(report.highlight.count)} ${report.highlight.unit}`;
}

function highlightLabel(report: PeriodReport): string | null {
  if (!report.highlight) {
    return null;
  }
  return isMatchMetric(report.highlight.metric)
    ? MATCH_METRIC_LABEL[report.highlight.metric]
    : report.highlight.metric;
}

/** Period recap poster: days active on the streak fill. */
export function periodReportPoster(report: PeriodReport): SharePoster {
  const label =
    report.period === 'week'
      ? 'Week recap'
      : report.period === 'month'
        ? 'Month recap'
        : 'Year wrapped';

  const facts: SharePosterFact[] = [];
  const leadLabel = highlightLabel(report);
  if (report.highlight && leadLabel) {
    facts.push({
      label: leadLabel,
      value: formatCount(report.highlight.count),
    });
  }

  return {
    kind: 'streak',
    label,
    value: String(report.activeDays),
    unit: report.activeDays === 1 ? 'day active' : 'days active',
    corner: report.periodLabel,
    ...(facts.length > 0 ? { facts } : {}),
  };
}

export function periodReportRunLine(report: PeriodReport): string | null {
  return highlightLine(report);
}

/** Lead metric under the days-active hero — board place needs a richer API later. */
export function periodReportFacts(report: PeriodReport): ProgressFact[] {
  const leadLabel = highlightLabel(report);
  if (!report.highlight || !leadLabel) {
    return [];
  }
  return [
    {
      label: leadLabel,
      value: formatCount(report.highlight.count),
    },
  ];
}

export function periodReportShareText(report: PeriodReport): string {
  const highlight = highlightLine(report);
  const days =
    report.activeDays === 1
      ? '1 day active'
      : `${report.activeDays} days active`;
  return highlight
    ? `I had ${days} on Healthy (${report.periodLabel}). ${highlight}.`
    : `I had ${days} on Healthy (${report.periodLabel}).`;
}

/** Metric period poster: activity fill, total as the hero. */
export function metricPeriodPoster(stats: MetricPeriodStats): SharePoster {
  const kind = DECK_KIND_BY_METRIC[stats.metric] ?? 'walk';
  const label = isMatchMetric(stats.metric)
    ? MATCH_METRIC_LABEL[stats.metric]
    : stats.metric;

  return {
    kind,
    label,
    value: formatCount(stats.count),
    unit: stats.unit,
    corner: stats.periodLabel,
    facts: metricPeriodFacts(stats).map((fact) => ({
      label: fact.label,
      value: fact.value,
    })),
  };
}

export function metricPeriodFacts(stats: MetricPeriodStats): ProgressFact[] {
  return [
    {
      label: 'Best day',
      value: stats.bestDay ? formatCount(stats.bestDay.count) : '—',
    },
    {
      label: 'Days on',
      value: String(stats.activeDays),
    },
    {
      label: 'Avg / day',
      value: formatCount(stats.avgPerDay),
    },
  ];
}

export function metricPeriodRunLine(stats: MetricPeriodStats): string | null {
  if (stats.activeDays <= 0) {
    return null;
  }
  return stats.activeDays === 1 ? '1 day on' : `${stats.activeDays} days on`;
}

export function metricPeriodShareText(stats: MetricPeriodStats): string {
  const label = isMatchMetric(stats.metric)
    ? MATCH_METRIC_LABEL[stats.metric]
    : stats.metric;
  return `I did ${formatCount(stats.count)} ${stats.unit} on Healthy (${stats.periodLabel}). ${label}.`;
}
