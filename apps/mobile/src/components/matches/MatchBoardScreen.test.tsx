import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Share } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Metrics } from 'react-native-safe-area-context';
import { apiClient } from '@/lib/api';
import { MatchBoardScreen } from './MatchBoardScreen';

const testSafeAreaMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    getMatch: jest.fn(),
    cancelMatch: jest.fn(),
    saveCrew: jest.fn(),
  },
  apiQuery: {},
}));

jest.mock('expo-router', () => {
  const navigate = jest.fn();
  return { useRouter: () => ({ navigate }) };
});

const mockedApi = apiClient as unknown as {
  getMatch: jest.Mock;
  cancelMatch: jest.Mock;
  saveCrew: jest.Mock;
};

type Standing = {
  userId: string;
  displayName: string;
  score: number;
  rank: number;
  isYou: boolean;
  isHost: boolean;
  isPending: boolean;
};

function standing(overrides: Partial<Standing> & { userId: string }): Standing {
  return {
    displayName: 'Bee',
    score: 0,
    rank: 1,
    isYou: false,
    isHost: false,
    isPending: false,
    ...overrides,
  };
}

function liveMatch(overrides: Record<string, unknown> = {}) {
  return {
    id: 'm1',
    token: 'tok-1',
    inviteUrl: 'https://gethealthyapp.com/match/tok-1',
    metric: 'pushups',
    scoringMode: 'best_single',
    status: 'open',
    endsAt: '2099-01-01T00:00:00.000Z',
    participantCount: 2,
    participantCap: 6,
    winnerUserId: null,
    yourScore: 30,
    canSaveCrew: false,
    standings: [
      standing({ userId: 'u1', displayName: 'Bee', score: 40, rank: 1 }),
      standing({
        userId: 'u2',
        displayName: 'Nurul',
        score: 30,
        rank: 2,
        isYou: true,
        isHost: true,
      }),
    ],
    ...overrides,
  };
}

function renderBoard() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  function wrap(ui: ReactElement) {
    return (
      <SafeAreaProvider initialMetrics={testSafeAreaMetrics}>
        <QueryClientProvider client={client}>{ui}</QueryClientProvider>
      </SafeAreaProvider>
    );
  }

  const view = render(wrap(<MatchBoardScreen matchId="m1" />));
  return {
    cleanup: async () => {
      await waitFor(() => {
        expect(client.isFetching()).toBe(0);
      });
      view.unmount();
      client.clear();
    },
  };
}

describe('MatchBoardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('names your own row rather than repeating your display name', async () => {
    mockedApi.getMatch.mockResolvedValue(liveMatch());
    const { cleanup } = renderBoard();

    const yourRow = within(await screen.findByTestId('match-standing-u2'));
    expect(yourRow.getByText('You')).toBeOnTheScreen();
    expect(yourRow.getByText('Host')).toBeOnTheScreen();
    expect(screen.queryByText('Nurul')).toBeNull();

    await cleanup();
  });

  it('measures every row against the leader', async () => {
    mockedApi.getMatch.mockResolvedValue(liveMatch());
    const { cleanup } = renderBoard();

    // The leader carries the count alone; everyone else says how far off it is.
    const leader = within(await screen.findByTestId('match-standing-u1'));
    expect(leader.getByText('40')).toBeOnTheScreen();
    expect(leader.queryByText(/behind/)).toBeNull();

    const yourRow = within(screen.getByTestId('match-standing-u2'));
    expect(yourRow.getByText('30')).toBeOnTheScreen();
    expect(yourRow.getByText('10 behind')).toBeOnTheScreen();

    await cleanup();
  });

  it('marks a player with no set instead of scoring them zero', async () => {
    mockedApi.getMatch.mockResolvedValue(
      liveMatch({
        standings: [
          standing({ userId: 'u1', score: 40, rank: 1 }),
          standing({
            userId: 'u2',
            displayName: 'Nurul',
            score: 0,
            rank: 2,
            isYou: true,
          }),
        ],
      }),
    );
    const { cleanup } = renderBoard();

    const yourRow = within(await screen.findByTestId('match-standing-u2'));
    expect(yourRow.getByText('Nothing yet')).toBeOnTheScreen();
    expect(yourRow.queryByText('0')).toBeNull();

    await cleanup();
  });

  it('keeps doing a set as the only button while the match is live', async () => {
    mockedApi.getMatch.mockResolvedValue(liveMatch());
    const { cleanup } = renderBoard();

    fireEvent.press(await screen.findByTestId('match-do-set'));
    const { useRouter } = jest.requireMock('expo-router') as {
      useRouter: () => { navigate: jest.Mock };
    };
    expect(useRouter().navigate).toHaveBeenCalledWith('/matches/m1/pose');

    // Sharing and cancelling stay out of the primary lane.
    expect(screen.getByTestId('match-share-link')).toBeOnTheScreen();
    expect(screen.getByTestId('match-cancel')).toBeOnTheScreen();

    await cleanup();
  });

  it('shares the https link the server minted, not a custom scheme', async () => {
    const share = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction' } as never);
    mockedApi.getMatch.mockResolvedValue(liveMatch());
    const { cleanup } = renderBoard();

    fireEvent.press(await screen.findByTestId('match-share-link'));

    await waitFor(() => {
      expect(share).toHaveBeenCalledTimes(1);
    });
    expect(share).toHaveBeenCalledWith({
      url: 'https://gethealthyapp.com/match/tok-1',
    });

    share.mockRestore();
    await cleanup();
  });

  it('drops the action bar once the match is over', async () => {
    mockedApi.getMatch.mockResolvedValue(
      liveMatch({ status: 'ended', winnerUserId: 'u1' }),
    );
    const { cleanup } = renderBoard();

    expect(await screen.findByTestId('match-winner')).toBeOnTheScreen();
    expect(screen.queryByTestId('match-do-set')).toBeNull();
    expect(screen.queryByTestId('match-share-link')).toBeNull();
    expect(screen.queryByTestId('match-cancel')).toBeNull();

    await cleanup();
  });

  it('shows a crew-seated member as invited rather than beaten', async () => {
    mockedApi.getMatch.mockResolvedValue(
      liveMatch({
        standings: [
          standing({ userId: 'u1', score: 40, rank: 1 }),
          standing({
            userId: 'u2',
            displayName: 'Cam',
            score: 0,
            rank: 2,
            isPending: true,
          }),
        ],
      }),
    );
    const { cleanup } = renderBoard();

    const pendingRow = within(await screen.findByTestId('match-standing-u2'));
    // "Invited", not "40 behind": they have not agreed to play yet.
    expect(pendingRow.getAllByText('Invited').length).toBeGreaterThan(0);
    expect(pendingRow.queryByText(/behind/)).toBeNull();

    await cleanup();
  });

  it('offers to keep the crew once the contest is over', async () => {
    mockedApi.getMatch.mockResolvedValue(
      liveMatch({ status: 'ended', winnerUserId: 'u1', canSaveCrew: true }),
    );
    mockedApi.saveCrew.mockResolvedValue({
      crew: {
        id: 'crew-1',
        name: 'Bee',
        memberCount: 1,
        memberNames: ['Bee'],
        isOwner: true,
      },
      alreadyExisted: false,
    });
    const { cleanup } = renderBoard();

    fireEvent.press(await screen.findByTestId('match-save-crew'));

    await waitFor(() => {
      expect(mockedApi.saveCrew).toHaveBeenCalledWith({ matchId: 'm1' });
    });
    expect(await screen.findByText('Saved')).toBeOnTheScreen();

    await cleanup();
  });

  it('does not offer a crew while the contest is still running', async () => {
    mockedApi.getMatch.mockResolvedValue(liveMatch());
    const { cleanup } = renderBoard();

    expect(await screen.findByTestId('match-do-set')).toBeOnTheScreen();
    expect(screen.queryByTestId('match-save-crew')).toBeNull();

    await cleanup();
  });

  it('sells the invite instead of ranking a host against themselves', async () => {
    mockedApi.getMatch.mockResolvedValue(
      liveMatch({
        participantCount: 1,
        yourScore: 0,
        standings: [
          standing({
            userId: 'u2',
            displayName: 'Nurul',
            score: 0,
            rank: 1,
            isYou: true,
            isHost: true,
          }),
        ],
      }),
    );
    const { cleanup } = renderBoard();

    expect(await screen.findByTestId('match-waiting')).toBeOnTheScreen();
    // A board of one has nothing to rank, so no standings and no place.
    expect(screen.queryByText('Standings')).toBeNull();
    expect(screen.queryByTestId('match-standing-u2')).toBeNull();
    expect(screen.getByTestId('match-solo-score')).toBeOnTheScreen();

    // Sharing takes the primary lane; doing a set stays available beneath it.
    expect(screen.getByTestId('match-share-link')).toBeOnTheScreen();
    expect(screen.getByTestId('match-do-set')).toBeOnTheScreen();

    await cleanup();
  });

  it('shows a logged score as the hero even while nobody else has joined', async () => {
    mockedApi.getMatch.mockResolvedValue(
      liveMatch({
        participantCount: 1,
        scoringMode: 'cumulative_total',
        metric: 'walk',
        yourScore: 7,
        standings: [
          standing({
            userId: 'u2',
            displayName: 'Nurul',
            score: 7,
            rank: 1,
            isYou: true,
            isHost: true,
          }),
        ],
      }),
    );
    const { cleanup } = renderBoard();

    // The walk counted, so the number leads and the invite becomes a note.
    expect(await screen.findByText('7')).toBeOnTheScreen();
    expect(screen.getByText('Your total')).toBeOnTheScreen();
    expect(screen.getByTestId('match-waiting-note')).toBeOnTheScreen();
    expect(screen.queryByTestId('match-waiting')).toBeNull();
    // Still nobody to be ahead of, so no place is claimed.
    expect(screen.queryByText(/#1/)).toBeNull();

    await cleanup();
  });

  it('hides the invite once the match is full', async () => {
    mockedApi.getMatch.mockResolvedValue(
      liveMatch({ participantCount: 6, participantCap: 6 }),
    );
    const { cleanup } = renderBoard();

    expect(await screen.findByTestId('match-do-set')).toBeOnTheScreen();
    expect(screen.queryByTestId('match-share-link')).toBeNull();

    await cleanup();
  });
});
