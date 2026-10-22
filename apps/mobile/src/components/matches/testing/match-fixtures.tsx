import type { MatchBoard, MatchListItem, MatchPreview, MatchStanding } from '@product/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';

const DAY_MS = 86_400_000;

const testSafeAreaMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export function standing(overrides: Partial<MatchStanding> & { userId: string }): MatchStanding {
  return {
    displayName: overrides.userId,
    image: null,
    rank: 1,
    score: 0,
    bestCount: 0,
    isYou: false,
    isHost: false,
    isPending: false,
    doneToday: false,
    yourReactionsToday: [],
    ...overrides,
  };
}

/** A 7-day walking total, four days in: Ada leads, you are second, Tunde has not walked. */
export function liveBoard(overrides: Partial<MatchBoard> = {}): MatchBoard {
  return {
    id: 'm1',
    token: 'tok-1',
    inviteUrl: 'https://gethealthyapp.com/match/tok-1',
    metric: 'walk',
    scoringMode: 'cumulative_total',
    dailyScope: 'any_challenge',
    startsAt: new Date(Date.now() - 3 * DAY_MS).toISOString(),
    endsAt: new Date(Date.now() + 4.5 * DAY_MS).toISOString(),
    status: 'open',
    participantCount: 3,
    participantCap: 8,
    yourScore: 86,
    yourBestCount: 86,
    winnerUserId: null,
    canSaveCrew: false,
    standings: [
      standing({
        userId: 'ada',
        displayName: 'Ada',
        rank: 1,
        score: 112,
        doneToday: true,
        image: 'https://cdn.example/ada.jpg',
      }),
      standing({
        userId: 'me',
        displayName: 'Nurul',
        rank: 2,
        score: 86,
        isYou: true,
        isHost: true,
        doneToday: true,
      }),
      standing({ userId: 'tunde', displayName: 'Tunde', rank: 3, score: 30 }),
    ],
    ...overrides,
  };
}

export function listItem(overrides: Partial<MatchListItem> = {}): MatchListItem {
  const board = liveBoard();
  return {
    id: board.id,
    title: 'vs Ada and Tunde',
    metric: board.metric,
    scoringMode: board.scoringMode,
    dailyScope: board.dailyScope,
    endsAt: board.endsAt,
    status: 'open',
    participantCount: 3,
    yourScore: 86,
    yourBestCount: 86,
    yourRank: 2,
    roster: board.standings,
    lastMove: null,
    standings: board.standings,
    ...overrides,
  };
}

export function invitePreview(overrides: Partial<MatchPreview> = {}): MatchPreview {
  return {
    token: 'tok-1',
    matchId: 'm1',
    hostDisplayName: 'Ada',
    hostImage: null,
    metric: 'walk',
    scoringMode: 'cumulative_total',
    dailyScope: 'any_challenge',
    endsAt: new Date(Date.now() + 6.5 * DAY_MS).toISOString(),
    participantCount: 3,
    participantCap: 8,
    status: 'open',
    alreadyJoined: false,
    viewerIsHost: false,
    hostScore: null,
    parentMatchId: null,
    experimentId: null,
    experimentVariantKey: null,
    ...overrides,
  };
}

/** Renders inside the providers a screen needs, and waits for queries before unmounting. */
export function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  const view = render(
    <SafeAreaProvider initialMetrics={testSafeAreaMetrics}>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </SafeAreaProvider>,
  );

  return {
    ...view,
    cleanup: async () => {
      await waitFor(() => expect(client.isFetching()).toBe(0));
      view.unmount();
      client.clear();
    },
  };
}
