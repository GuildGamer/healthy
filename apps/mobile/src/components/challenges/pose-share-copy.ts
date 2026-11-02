import type { MatchMetric } from '@product/client';
import { isPoseMetric } from '@product/contract/match-board';
import { MATCH_METRIC_LABEL, MATCH_METRIC_UNIT } from '@/components/matches/match-metric';

const DEFAULT_POSE_METRIC: MatchMetric = 'pushups';

export type PoseShareCopy = {
  metric: MatchMetric;
  /** Title case, for the poster eyebrow: "Squats". */
  label: string;
  /** Lowercase measure under the number: "squats", "seconds". */
  unit: string;
  /** Poster footer: "squats, counted by camera". */
  countedUnit: string;
};

/**
 * How a camera set names itself on a finish card or share poster.
 * Missing or non-pose metrics fall back to push-ups, as old routes do.
 */
export function poseShareCopy(metric: string | null | undefined): PoseShareCopy {
  const resolved = metric && isPoseMetric(metric) ? metric : DEFAULT_POSE_METRIC;
  const unit = MATCH_METRIC_UNIT[resolved];
  return {
    metric: resolved,
    label: MATCH_METRIC_LABEL[resolved],
    unit,
    countedUnit: `${unit}, counted by camera`,
  };
}
