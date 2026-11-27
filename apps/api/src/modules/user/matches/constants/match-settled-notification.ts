export type MatchSettledPushCopy = {
  title: string;
  body: string;
};

export function matchSettledIdempotencyKey(matchId: string, userId: string): string {
  return `match_settled:${matchId}:${userId}`;
}

/**
 * Winner gets a personal line; honor holders hear their title; everyone else
 * hears who took it. No dashes — push copy stays short and plain.
 */
export function matchSettledPushCopy(input: {
  contestTitle: string;
  isWinner: boolean;
  winnerDisplayName: string | null;
  /** Viewer's primary honor title when they earned one (e.g. Comeback King!). */
  honorTitle?: string | null;
}): MatchSettledPushCopy {
  if (input.isWinner) {
    return {
      title: `You won ${input.contestTitle}`,
      body: 'See the final board.',
    };
  }

  if (input.honorTitle) {
    return {
      title: input.honorTitle,
      body: `${input.contestTitle} ended. See your honor.`,
    };
  }

  if (input.winnerDisplayName) {
    return {
      title: `${input.contestTitle} is over`,
      body: `${input.winnerDisplayName} took it. See the final board.`,
    };
  }

  return {
    title: `${input.contestTitle} is over`,
    body: 'See the final board.',
  };
}
