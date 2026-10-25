import type { MatchMetric, MatchScoringMode } from '@product/contract/match-board';
import { MATCH_METRIC_MEASURE } from '@product/contract/match-board';
import { MATCH_METRIC_UNIT } from './match-metric';

export type InviteMessageInput = {
  hostScore?: number | null;
  metric: MatchMetric;
  scoringMode: MatchScoringMode;
  endsAt?: string | Date | null;
};

const ACTIVITY_PLURAL: Record<MatchMetric, string> = {
  pushups: 'push-ups',
  walk: 'minutes walked',
  squats: 'squats',
  plank: 'seconds held',
  jumping_jacks: 'jumping jacks',
  burpees: 'burpees',
  sit_ups: 'sit-ups',
  mountain_climbers: 'mountain climbers',
  lunges: 'lunges',
};

const ACTIVITY_CONTEST: Record<MatchMetric, string> = {
  pushups: 'push-up',
  walk: 'walking',
  squats: 'squat',
  plank: 'plank',
  jumping_jacks: 'jumping-jack',
  burpees: 'burpee',
  sit_ups: 'sit-up',
  mountain_climbers: 'mountain-climber',
  lunges: 'lunge',
};

function ruleLine(input: InviteMessageInput): string {
  if (input.scoringMode === 'days_completed') {
    return 'Most days showing up wins.';
  }

  if (input.scoringMode === 'best_single') {
    if (MATCH_METRIC_MEASURE[input.metric] === 'seconds') {
      return 'Longest hold wins.';
    }
    return `Most ${ACTIVITY_PLURAL[input.metric]} in one go wins.`;
  }

  return `Most ${ACTIVITY_PLURAL[input.metric]} wins.`;
}

function deadlinePhrase(endsAt: string | Date | null | undefined, now: Date): string | null {
  if (!endsAt) {
    return null;
  }

  const end = typeof endsAt === 'string' ? new Date(endsAt) : endsAt;
  if (Number.isNaN(end.getTime()) || end.getTime() <= now.getTime()) {
    return null;
  }

  const msLeft = end.getTime() - now.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  if (msLeft <= dayMs * 1.5) {
    return 'by tonight';
  }

  if (msLeft <= dayMs * 7) {
    return `by ${end.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' })}`;
  }

  return null;
}

/**
 * Competitive share text for a contest invite. The URL is appended by the
 * share helper — this is the message only.
 */
export function inviteShareMessage(input: InviteMessageInput, now = new Date()): string {
  const rule = ruleLine(input);
  const deadline = deadlinePhrase(input.endsAt, now);
  const winLine = deadline ? `${rule.slice(0, -1)} ${deadline}.` : rule;

  if (input.hostScore != null && input.hostScore > 0) {
    const unit = MATCH_METRIC_UNIT[input.metric];
    return `I did ${input.hostScore} ${unit}. Think you can beat me? ${winLine}`;
  }

  return `I just started a ${ACTIVITY_CONTEST[input.metric]} contest. Think you can beat me? ${winLine}`;
}
