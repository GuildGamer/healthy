import type { MatchStanding } from '@product/contract';

export type StandingAttempt = {
  userId: string;
  count: number;
  recordedAt: Date;
};

export type StandingParticipant = {
  userId: string;
  displayName: string;
  isHost: boolean;
};

export type BestSingleResult = {
  standings: Omit<MatchStanding, 'isYou'>[];
  winnerUserId: string | null;
};

type BestByUser = {
  userId: string;
  displayName: string;
  isHost: boolean;
  bestCount: number;
  firstReachedAt: Date | null;
};

function compareBest(left: BestByUser, right: BestByUser): number {
  if (right.bestCount !== left.bestCount) {
    return right.bestCount - left.bestCount;
  }

  if (left.firstReachedAt && right.firstReachedAt) {
    const reached = left.firstReachedAt.getTime() - right.firstReachedAt.getTime();
    if (reached !== 0) {
      return reached;
    }
  }

  if (left.firstReachedAt && !right.firstReachedAt) {
    return -1;
  }

  if (!left.firstReachedAt && right.firstReachedAt) {
    return 1;
  }

  return left.userId.localeCompare(right.userId);
}

export function computeBestSingleStandings(
  participants: StandingParticipant[],
  attempts: StandingAttempt[],
): BestSingleResult {
  const bestByUser = new Map<string, BestByUser>();

  for (const participant of participants) {
    bestByUser.set(participant.userId, {
      userId: participant.userId,
      displayName: participant.displayName,
      isHost: participant.isHost,
      bestCount: 0,
      firstReachedAt: null,
    });
  }

  for (const attempt of attempts) {
    const current = bestByUser.get(attempt.userId);
    if (!current) {
      continue;
    }

    if (attempt.count < current.bestCount) {
      continue;
    }

    if (attempt.count > current.bestCount) {
      current.bestCount = attempt.count;
      current.firstReachedAt = attempt.recordedAt;
      continue;
    }

    if (
      current.firstReachedAt === null ||
      attempt.recordedAt.getTime() < current.firstReachedAt.getTime()
    ) {
      current.firstReachedAt = attempt.recordedAt;
    }
  }

  const ordered = [...bestByUser.values()].sort(compareBest);
  const winnerUserId =
    ordered[0] && ordered[0].bestCount > 0 ? ordered[0].userId : null;

  const standings: Omit<MatchStanding, 'isYou'>[] = [];
  let previous: BestByUser | undefined;
  let rank = 0;

  for (const [index, row] of ordered.entries()) {
    const tiedWithPrevious = previous !== undefined && previous.bestCount === row.bestCount;
    if (!tiedWithPrevious) {
      rank = index + 1;
    }

    standings.push({
      userId: row.userId,
      displayName: row.displayName,
      rank,
      bestCount: row.bestCount,
      isHost: row.isHost,
    });
    previous = row;
  }

  return { standings, winnerUserId };
}
