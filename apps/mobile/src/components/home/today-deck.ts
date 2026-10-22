import type { MatchListItem, TodayChallenge, TodayDetails } from '@product/client';
import {
  buildTodayWin,
  sortOpenChallengesByFocus,
} from '@/components/challenges/challenge-list-layout';
import { challengeProgress } from '@/components/challenges/challenge-progress';
import type { HealthTip } from '@/components/tips';
import { DECK_KIND_BY_METRIC, deckCardKindFor } from '@/components/deck';
import { weekDayKeys } from './day-keys';
import { deckCardMeasure } from './deck-card-content';
import { groupMoveActivity } from './today-labels';
import type {
  ChallengeDeckItem,
  DeckCardTag,
  DeckItem,
  GroupDeckItem,
  GroupPresence,
  TallySegment,
  TodayDeck,
} from './types/today-deck';

export const DAY_DONE_KEY = 'day-done';

type TodayDeckInput = {
  challenges: readonly TodayChallenge[];
  hasMembership: boolean;
  liveGroups: readonly MatchListItem[];
  todayTip: HealthTip | null;
  /** Null until they land; every card draws without them first. */
  details: TodayDetails | null;
  /** Steps this phone has counted today, once the pedometer has answered. */
  phoneSteps?: number | null;
};

/**
 * What is underway comes back to the top; after it the dailies, then the week
 * and month ones, each group in the order "Do next" has always used.
 */
export function orderOpenChallenges(open: readonly TodayChallenge[]): TodayChallenge[] {
  const [first, ...rest] = sortOpenChallengesByFocus(open);
  if (!first) {
    return [];
  }

  const dailies = rest.filter((item) => item.frequency === 'daily');
  const periodic = rest.filter((item) => item.frequency !== 'daily');
  return [first, ...dailies, ...periodic];
}

/** A counted card fills its segment as far as its numeral; the rest by fields entered. */
function segmentFill(
  item: ChallengeDeckItem,
  todayKey: string,
  phoneSteps: number | null,
): number {
  const { challenge } = item;
  const measure = deckCardMeasure(challenge, { detail: item.detail, todayKey, phoneSteps });
  if (measure.kind === 'count') {
    return measure.fill;
  }

  const progress = challengeProgress(challenge.status, challenge.progress);
  if (progress.kind === 'done') {
    return 1;
  }

  if (progress.kind === 'step') {
    return progress.step / progress.total;
  }

  return 0;
}

function periodTag(challenge: TodayChallenge): DeckCardTag | null {
  if (challenge.frequency === 'weekly') {
    return 'week';
  }

  return challenge.frequency === 'monthly' ? 'month' : null;
}

function cardTag(
  challenge: TodayChallenge,
  position: number,
  winLineAfter: number | null,
): DeckCardTag | null {
  const isPastWinLine = winLineAfter !== null && position > winLineAfter;
  return isPastWinLine ? 'extra' : periodTag(challenge);
}

function groupItem(match: MatchListItem): GroupDeckItem {
  return {
    type: 'group',
    key: `group-${match.id}`,
    match,
    kind: DECK_KIND_BY_METRIC[match.metric] ?? 'mobility',
  };
}

/** Rides on the first open card about the tip's condition, and nowhere else. */
function tipOwnerId(open: readonly TodayChallenge[], tip: HealthTip | null): string | null {
  if (!tip) {
    return null;
  }

  return open.find((challenge) => challenge.category === tip.category)?.id ?? null;
}

/** The latest move across live groups; each group already narrowed it to today. */
export function latestGroupPresence(liveGroups: readonly MatchListItem[]): GroupPresence | null {
  let latest: GroupPresence | null = null;
  for (const match of liveGroups) {
    const move = match.lastMove;
    if (move && (!latest || Date.parse(move.movedAt) > Date.parse(latest.movedAt))) {
      latest = { ...move, activity: groupMoveActivity(match) };
    }
  }

  return latest;
}

/**
 * Deals today as a deck: finished cards first in the tally, then the open ones
 * in the order they are played. A finished day (or a free member's locked win)
 * puts the day's summary on top, with any extras still behind it.
 */
export function buildTodayDeck({
  challenges,
  hasMembership,
  liveGroups,
  todayTip,
  details,
  phoneSteps = null,
}: TodayDeckInput): TodayDeck {
  const completed = challenges.filter((item) => item.status === 'completed');
  const open = orderOpenChallenges(challenges.filter((item) => item.status !== 'completed'));
  const win = buildTodayWin(completed.length, challenges.length, hasMembership);
  const winLineAfter = !hasMembership && win.target < challenges.length ? win.target : null;
  const tipOwner = tipOwnerId(open, todayTip);
  const detailById = new Map(
    (details?.occurrences ?? []).map((detail) => [detail.userChallengeId, detail]),
  );

  const toItem = (challenge: TodayChallenge, index: number): ChallengeDeckItem => {
    const position = index + 1;
    return {
      type: 'challenge',
      key: challenge.id,
      challenge,
      kind: deckCardKindFor(challenge),
      position,
      tag: cardTag(challenge, position, winLineAfter),
      tip: challenge.id === tipOwner ? todayTip : null,
      detail: detailById.get(challenge.id) ?? null,
    };
  };

  const ordered = [...completed, ...open].map(toItem);
  const done = ordered.slice(0, completed.length);
  const openItems = ordered.slice(completed.length);
  const segments: TallySegment[] = ordered.map((item) => ({
    id: item.key,
    kind: item.kind,
    fill: segmentFill(item, details?.dayKey ?? '', phoneSteps),
    isDone: item.challenge.status === 'completed',
  }));

  const isDayDone = win.locked;
  const dayDone: DeckItem[] = isDayDone ? [{ type: 'dayDone', key: DAY_DONE_KEY }] : [];

  return {
    segments,
    winLineAfter,
    items: [...dayDone, ...openItems, ...liveGroups.map(groupItem)],
    done,
    completedCount: completed.length,
    totalCount: challenges.length,
    openCount: open.length,
    win,
    isDayDone,
    pointsToday: completed.reduce((total, item) => total + item.rewardPoints, 0),
    showsMembershipLine: !hasMembership && win.locked && open.length > 0,
    weekDayKeys: details ? weekDayKeys(details.weekStartKey) : null,
    presence: latestGroupPresence(liveGroups),
    phoneSteps,
  };
}
