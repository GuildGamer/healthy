import type { PublicMatchInvitePreview } from '@product/contract';
import type { MatchMetric, MatchScoringMode } from '@product/contract/match-board';
import { MATCH_METRIC_MEASURE } from '@product/contract/match-board';
import type { DeckCardContent } from './constants/welcome-deck';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The two facts an invite preview carries about how the group is won. It does
 * not say whether a streak is open to every daily challenge, so a streak is
 * always named without an activity: nothing on it may hint at a condition.
 */
export type InviteRules = Pick<PublicMatchInvitePreview, 'metric' | 'scoringMode'>;

const ACTIVITY_ADJECTIVE: Record<MatchMetric, string> = {
  pushups: 'Push-up',
  walk: 'Walking',
  squats: 'Squat',
  plank: 'Plank',
  jumping_jacks: 'Jumping-jack',
  burpees: 'Burpee',
  sit_ups: 'Sit-up',
  mountain_climbers: 'Mountain-climber',
  lunges: 'Lunge',
};

const ACTIVITY_NOUN: Record<MatchMetric, string> = {
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

const ACTIVITY_UNIT: Record<MatchMetric, string> = {
  pushups: 'push-ups',
  walk: 'minutes',
  squats: 'squats',
  plank: 'seconds',
  jumping_jacks: 'jumping jacks',
  burpees: 'burpees',
  sit_ups: 'sit-ups',
  mountain_climbers: 'mountain climbers',
  lunges: 'lunges',
};

const MODE_WORD: Record<MatchScoringMode, string> = {
  best_single: 'best set',
  cumulative_total: 'total',
  days_completed: 'streak',
};

/** The group as one Today card: its fill and marks, by activity. */
const ACTIVITY_CARD: Record<
  MatchMetric,
  Pick<DeckCardContent, 'kind' | 'categoryGlyph' | 'proofGlyph' | 'proof'>
> = {
  pushups: {
    kind: 'strength',
    categoryGlyph: 'everydayHealth',
    proofGlyph: 'check',
    proof: 'Counted by your camera',
  },
  walk: {
    kind: 'walk',
    categoryGlyph: 'walk',
    proofGlyph: 'walk',
    proof: 'Walks you already track count',
  },
  squats: {
    kind: 'strength',
    categoryGlyph: 'everydayHealth',
    proofGlyph: 'check',
    proof: 'Counted by your camera',
  },
  plank: {
    kind: 'strength',
    categoryGlyph: 'everydayHealth',
    proofGlyph: 'check',
    proof: 'Timed by your camera',
  },
  jumping_jacks: {
    kind: 'strength',
    categoryGlyph: 'everydayHealth',
    proofGlyph: 'check',
    proof: 'Counted by your camera',
  },
  burpees: {
    kind: 'strength',
    categoryGlyph: 'everydayHealth',
    proofGlyph: 'check',
    proof: 'Counted by your camera',
  },
  sit_ups: {
    kind: 'strength',
    categoryGlyph: 'everydayHealth',
    proofGlyph: 'check',
    proof: 'Counted by your camera',
  },
  mountain_climbers: {
    kind: 'strength',
    categoryGlyph: 'everydayHealth',
    proofGlyph: 'check',
    proof: 'Counted by your camera',
  },
  lunges: {
    kind: 'strength',
    categoryGlyph: 'everydayHealth',
    proofGlyph: 'check',
    proof: 'Counted by your camera',
  },
};

const STREAK_PROOF = 'Each day you finish counts';

function isStreak(rules: InviteRules): boolean {
  return rules.scoringMode === 'days_completed';
}

/** "Walking total", "Push-up best set", or plain "Streak". */
export function inviteKindLabel(rules: InviteRules): string {
  if (isStreak(rules)) {
    return 'Streak';
  }

  return `${ACTIVITY_ADJECTIVE[rules.metric]} ${MODE_WORD[rules.scoringMode]}`;
}

/** `Make an account to join the walking group.` */
export function inviteJoinLine(rules: InviteRules): string {
  const noun = isStreak(rules) ? MODE_WORD.days_completed : ACTIVITY_NOUN[rules.metric];
  return `Make an account to join the ${noun} group.`;
}

/** The whole contest in one line, as the invite card's headline. */
export function inviteRuleHeadline(rules: InviteRules): string {
  if (isStreak(rules)) {
    return 'Most days showing up wins.';
  }

  if (rules.scoringMode === 'best_single') {
    if (MATCH_METRIC_MEASURE[rules.metric] === 'seconds') {
      return 'Longest hold wins.';
    }
    return `Most ${ACTIVITY_UNIT[rules.metric]} in one go wins.`;
  }

  if (rules.metric === 'walk') {
    return 'Most minutes walked wins.';
  }

  if (MATCH_METRIC_MEASURE[rules.metric] === 'seconds') {
    return 'Most seconds held wins.';
  }

  return `Most ${ACTIVITY_UNIT[rules.metric]} in total wins.`;
}

export function inviteDaysLeft(endsAt: string, now: Date): string {
  const days = Math.ceil((new Date(endsAt).getTime() - now.getTime()) / DAY_MS);
  if (days <= 0) {
    return 'Ends today';
  }

  return days === 1 ? '1 day left' : `${days} days left`;
}

/** What a group member sees of you, named plainly before you join. */
export function invitePrivacyNote(rules: InviteRules): string {
  if (isStreak(rules)) {
    return 'Others see your name and how many days you’ve done. Nothing else.';
  }

  const measure =
    rules.metric === 'walk'
      ? 'minutes walked'
      : MATCH_METRIC_MEASURE[rules.metric] === 'seconds'
        ? 'seconds held'
        : ACTIVITY_UNIT[rules.metric];
  return `Others see your name and ${measure}. Nothing else.`;
}

export function inviteDeckCard(
  invite: InviteRules & Pick<PublicMatchInvitePreview, 'endsAt'>,
  now: Date,
): DeckCardContent {
  const activityCard = ACTIVITY_CARD[invite.metric];

  return {
    id: `invite-${invite.metric}-${invite.scoringMode}`,
    ...activityCard,
    category: inviteKindLabel(invite),
    proof: isStreak(invite) ? STREAK_PROOF : activityCard.proof,
    when: inviteDaysLeft(invite.endsAt, now),
    title: inviteRuleHeadline(invite),
  };
}
