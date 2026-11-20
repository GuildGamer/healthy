import { type MatchStanding, matchTimeLeft } from '@product/contract';
import type {
  ReminderRivalry,
  ReminderRivalrySituation,
} from '../../shared-modules/engagement/index.js';
import { isWithinCloseMargin } from './constants/board-move-notification.js';
import type { ReminderContest } from './types/reminder-contest.js';

/** Inside this, trailing is about the clock rather than the gap. */
const CLOSING_WINDOW_MS = 24 * 60 * 60 * 1000;

type Pick = {
  situation: ReminderRivalrySituation;
  rival: MatchStanding;
};

type ContestStanding = {
  you: MatchStanding;
  /** Accepted group mates in rank order. Pending seats are never named. */
  others: MatchStanding[];
  /** The best-ranked group mate: the leader when you trail, the runner-up when you lead. */
  topOther: MatchStanding;
  youMovedToday: boolean;
  isLeading: boolean;
};

function standingFor(contest: ReminderContest): ContestStanding | null {
  const ranked = [...(contest.item.standings ?? [])].sort((left, right) => left.rank - right.rank);
  const you = ranked.find((standing) => standing.isYou);
  const others = ranked.filter((standing) => !standing.isYou && !standing.isPending);
  const topOther = others[0];
  if (!you || !topOther) {
    return null;
  }

  return {
    you,
    others,
    topOther,
    youMovedToday: contest.doneTodayUserIds.has(you.userId),
    isLeading: you.rank < topOther.rank,
  };
}

function closingPick(contest: ReminderContest, standing: ContestStanding, now: Date): Pick | null {
  const leader = standing.topOther;
  const remainingMs = Date.parse(contest.item.endsAt) - now.getTime();
  if (standing.isLeading || leader.score === 0 || remainingMs > CLOSING_WINDOW_MS) {
    return null;
  }

  return { situation: 'group_closing', rival: leader };
}

function movedTodayPick(contest: ReminderContest, standing: ContestStanding): Pick | null {
  if (standing.youMovedToday) {
    return null;
  }

  const movedToday = standing.others.filter((other) => contest.doneTodayUserIds.has(other.userId));

  if (contest.item.scoringMode === 'days_completed') {
    const rival = movedToday[0];
    return rival ? { situation: 'group_streak_gap', rival } : null;
  }

  const rivalAbove = movedToday.find((other) => other.rank < standing.you.rank);
  return rivalAbove ? { situation: 'group_rival_moved', rival: rivalAbove } : null;
}

function defendPick(standing: ContestStanding): Pick | null {
  const runnerUp = standing.topOther;
  if (!standing.isLeading || runnerUp.score === 0) {
    return null;
  }

  const isLevel = runnerUp.score === standing.you.score;
  if (!isLevel && !isWithinCloseMargin(runnerUp.score, standing.you.score)) {
    return null;
  }

  return { situation: 'group_defend', rival: runnerUp };
}

function rivalryForContest(contest: ReminderContest, now: Date): ReminderRivalry | null {
  const standing = standingFor(contest);
  if (!standing) {
    return null;
  }

  const pick =
    closingPick(contest, standing, now) ??
    movedTodayPick(contest, standing) ??
    defendPick(standing);
  if (!pick) {
    return null;
  }

  return {
    matchId: contest.item.id,
    situation: pick.situation,
    contestTitle: contest.item.title,
    scoringMode: contest.item.scoringMode,
    metric: contest.item.metric,
    rivalName: pick.rival.displayName,
    rivalScore: pick.rival.score,
    yourScore: standing.you.score,
    timeLeft: matchTimeLeft(contest.item.endsAt, now),
  };
}

/**
 * The one live group worth naming in today's reminder: the contest ending
 * soonest that has something at stake. Within a contest, trailing near the
 * end beats a rival's move today, which beats a close lead to defend.
 */
export function pickReminderRivalry(
  contests: readonly ReminderContest[],
  now: Date,
): ReminderRivalry | null {
  const soonestFirst = [...contests].sort(
    (left, right) => Date.parse(left.item.endsAt) - Date.parse(right.item.endsAt),
  );

  for (const contest of soonestFirst) {
    const rivalry = rivalryForContest(contest, now);
    if (rivalry) {
      return rivalry;
    }
  }

  return null;
}
