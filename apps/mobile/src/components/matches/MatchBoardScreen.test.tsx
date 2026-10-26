import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { Alert, Share } from 'react-native';
import { apiClient } from '@/lib/api';
import { hasSeenMatchResult } from '@/lib/seen-match-results';
import { MatchBoardScreen } from './MatchBoardScreen';
import { liveBoard, renderWithClient, standing } from './testing/match-fixtures';

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    getMatch: jest.fn(),
    cancelMatch: jest.fn(),
    leaveMatch: jest.fn(),
    reactToMatchMember: jest.fn(),
  },
  apiQuery: {},
}));

jest.mock('@/lib/seen-match-results', () => ({
  hasSeenMatchResult: jest.fn(async () => true),
}));

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ navigate: mockNavigate, replace: mockReplace, push: jest.fn() }),
  router: { replace: jest.fn(), canDismiss: () => false, dismiss: jest.fn() },
  Redirect: ({ href }: { href: string }) => {
    const { Text: MockText } = jest.requireActual('react-native');
    return <MockText testID="redirect">{href}</MockText>;
  },
}));

const mockedApi = apiClient as unknown as Record<
  'getMatch' | 'cancelMatch' | 'leaveMatch' | 'reactToMatchMember',
  jest.Mock
>;

describe('MatchBoardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.reactToMatchMember.mockImplementation(async () => liveBoard());
  });

  it('leads with the group best and who holds it, then today, then standings', async () => {
    mockedApi.getMatch.mockResolvedValue(liveBoard());
    const view = renderWithClient(<MatchBoardScreen matchId="m1" />);

    const hero = await screen.findByTestId('match-board-hero');
    expect(within(hero).getByText('Walking total')).toBeOnTheScreen();
    expect(within(hero).getByText('112')).toBeOnTheScreen();
    expect(within(hero).getByText('Group best · Ada')).toBeOnTheScreen();
    expect(screen.getByText('2 of 3 walked')).toBeOnTheScreen();
    expect(screen.getByTestId('match-standing-tunde')).toBeOnTheScreen();
    expect(screen.getByText('Start a walk')).toBeOnTheScreen();
    await view.cleanup();
  });

  it('cheers a lit face with one tap', async () => {
    mockedApi.getMatch.mockResolvedValue(liveBoard());
    const view = renderWithClient(<MatchBoardScreen matchId="m1" />);

    fireEvent.press(await screen.findByLabelText('Ada'));

    await waitFor(() =>
      expect(mockedApi.reactToMatchMember).toHaveBeenCalledWith({
        matchId: 'm1',
        toUserId: 'ada',
        kind: 'cheer',
      }),
    );
    expect(await screen.findByText('You cheered Ada')).toBeOnTheScreen();
    await view.cleanup();
  });

  it('shows the exact push before a nudge is sent', async () => {
    mockedApi.getMatch.mockResolvedValue(liveBoard());
    const view = renderWithClient(<MatchBoardScreen matchId="m1" />);

    fireEvent.press(await screen.findByLabelText('Tunde'));

    const sheet = await screen.findByTestId('match-nudge-sheet');
    expect(within(sheet).getByText('Nudge Tunde?')).toBeOnTheScreen();
    expect(within(sheet).getByText('No walk from Tunde yet today.')).toBeOnTheScreen();
    expect(within(sheet).getByText('Nurul nudged you')).toBeOnTheScreen();
    expect(within(sheet).getByText('4 days left in your walking group.')).toBeOnTheScreen();
    expect(mockedApi.reactToMatchMember).not.toHaveBeenCalled();

    fireEvent.press(within(sheet).getByTestId('match-nudge-send'));
    await waitFor(() =>
      expect(mockedApi.reactToMatchMember).toHaveBeenCalledWith({
        matchId: 'm1',
        toUserId: 'tunde',
        kind: 'nudge',
      }),
    );
    await view.cleanup();
  });

  it('says when a nudge went out instead of sending another', async () => {
    const nudged = standing({
      userId: 'tunde',
      displayName: 'Tunde',
      rank: 3,
      score: 30,
      yourReactionsToday: [{ kind: 'nudge', sentAt: '2026-10-22T10:40:00.000Z' }],
    });
    const board = liveBoard();
    mockedApi.getMatch.mockResolvedValue({
      ...board,
      standings: [...board.standings.slice(0, 2), nudged],
    });
    const view = renderWithClient(<MatchBoardScreen matchId="m1" />);

    fireEvent.press(await screen.findByLabelText('Tunde'));

    expect(await screen.findByText(/^Nudged at .+\. Again tomorrow\.$/)).toBeOnTheScreen();
    expect(mockedApi.reactToMatchMember).not.toHaveBeenCalled();
    await view.cleanup();
  });

  it('sells the invite while nobody else has joined', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    mockedApi.getMatch.mockResolvedValue(
      liveBoard({
        participantCount: 1,
        yourScore: 0,
        standings: [standing({ userId: 'me', displayName: 'Nurul', isYou: true, isHost: true })],
      }),
    );
    const view = renderWithClient(<MatchBoardScreen matchId="m1" />);

    expect(await screen.findByTestId('match-waiting')).toBeOnTheScreen();
    expect(screen.getByText('Your walking group')).toBeOnTheScreen();
    expect(screen.queryByTestId('match-today-strip')).toBeNull();

    fireEvent.press(screen.getByTestId('match-share-link'));
    await waitFor(() => expect(share).toHaveBeenCalled());
    share.mockRestore();
    await view.cleanup();
  });

  it('lets a member who is not the host leave, after confirming', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const board = liveBoard();
    mockedApi.getMatch.mockResolvedValue({
      ...board,
      standings: board.standings.map((row) => ({ ...row, isHost: row.userId === 'ada' })),
    });
    mockedApi.leaveMatch.mockResolvedValue({ live: [], ended: [] });
    const view = renderWithClient(<MatchBoardScreen matchId="m1" />);

    fireEvent.press(await screen.findByTestId('match-nav-more'));
    fireEvent.press(await screen.findByTestId('match-leave'));
    const buttons = alert.mock.calls[0]?.[2] ?? [];
    buttons.find((button) => button.style === 'destructive')?.onPress?.();

    await waitFor(() => expect(mockedApi.leaveMatch).toHaveBeenCalledWith({ matchId: 'm1' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)/challenges'));
    alert.mockRestore();
    await view.cleanup();
  });

  it('draws your days as squares on a short streak', async () => {
    const board = liveBoard({ scoringMode: 'days_completed', yourScore: 2 });
    mockedApi.getMatch.mockResolvedValue({
      ...board,
      dayStrip: { dayKeys: ['2026-10-20', '2026-10-21', '2026-10-22'], todayKey: '2026-10-22' },
      standings: board.standings.map((row) =>
        row.isYou ? { ...row, movedDayKeys: ['2026-10-20', '2026-10-22'] } : row,
      ),
    });
    const view = renderWithClient(<MatchBoardScreen matchId="m1" />);

    expect(await screen.findByTestId('match-day-squares')).toBeOnTheScreen();
    expect(screen.getByText('of 3 days')).toBeOnTheScreen();
    expect(screen.getByTestId('match-day-2026-10-20-hit')).toBeOnTheScreen();
    expect(screen.getByTestId('match-day-2026-10-21')).toBeOnTheScreen();
    expect(screen.getByText('Streak')).toBeOnTheScreen();
    await view.cleanup();
  });

  it('opens a member’s photo from the standings', async () => {
    mockedApi.getMatch.mockResolvedValue(liveBoard());
    const view = renderWithClient(<MatchBoardScreen matchId="m1" />);

    fireEvent.press(await screen.findByLabelText('Ada’s photo'));

    expect(await screen.findByTestId('profile-photo-preview-image')).toBeOnTheScreen();
    await view.cleanup();
  });

  it('opens the result the first time a finished group is opened', async () => {
    (hasSeenMatchResult as jest.Mock).mockResolvedValueOnce(false);
    mockedApi.getMatch.mockResolvedValue(liveBoard({ status: 'completed', winnerUserId: 'ada' }));
    const view = renderWithClient(<MatchBoardScreen matchId="m1" />);

    expect(await screen.findByTestId('redirect')).toHaveTextContent('/matches/m1/result');
    await view.cleanup();
  });
});
