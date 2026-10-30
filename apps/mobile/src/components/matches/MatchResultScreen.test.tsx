import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { apiClient } from '@/lib/api';
import { markMatchResultSeen } from '@/lib/seen-match-results';
import { MatchResultScreen } from './MatchResultScreen';
import { liveBoard, renderWithClient, standing } from './testing/match-fixtures';

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: { getMatch: jest.fn(), saveCrew: jest.fn(), createMatch: jest.fn() },
  apiQuery: {},
}));

jest.mock('@/lib/seen-match-results', () => ({
  markMatchResultSeen: jest.fn(async () => undefined),
}));

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockedApi = apiClient as unknown as Record<
  'getMatch' | 'saveCrew' | 'createMatch',
  jest.Mock
>;

const DAY_MS = 86_400_000;

function wonBoard() {
  const startsAt = new Date(Date.now() - 8 * DAY_MS);
  return liveBoard({
    status: 'completed',
    startsAt: startsAt.toISOString(),
    endsAt: new Date(startsAt.getTime() + 7 * DAY_MS).toISOString(),
    winnerUserId: 'me',
    yourScore: 140,
    canSaveCrew: true,
    standings: [
      standing({
        userId: 'me',
        displayName: 'Nurul',
        isYou: true,
        isHost: true,
        rank: 1,
        score: 140,
      }),
      standing({ userId: 'ada', displayName: 'Ada', rank: 2, score: 131 }),
      standing({ userId: 'kemi', displayName: 'Kemi', rank: 3, score: 96 }),
      standing({ userId: 'tunde', displayName: 'Tunde', rank: 4, score: 60 }),
    ],
  });
}

describe('MatchResultScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('plays the ending once: podium, one sentence, and Run it back', async () => {
    mockedApi.getMatch.mockResolvedValue(wonBoard());
    const view = renderWithClient(<MatchResultScreen matchId="m1" />);

    expect(await screen.findByTestId('match-result-headline')).toHaveTextContent('You won.');
    expect(screen.getByText('140 minutes, 9 ahead of Ada.')).toBeOnTheScreen();
    expect(screen.getByText('Walking total · 7 days')).toBeOnTheScreen();
    expect(within(screen.getByTestId('match-podium-1')).getByText('You')).toBeOnTheScreen();
    expect(screen.getByTestId('match-standing-tunde')).toBeOnTheScreen();
    expect(markMatchResultSeen).toHaveBeenCalledWith('m1');
    await view.cleanup();
  });

  it('shares the result as an image that names nobody else', async () => {
    mockedApi.getMatch.mockResolvedValue(wonBoard());
    const view = renderWithClient(<MatchResultScreen matchId="m1" />);

    const hidden = { includeHiddenElements: true };
    const card = await screen.findByTestId('match-recap-card', hidden);
    expect(within(card).getByText('1st', hidden)).toBeOnTheScreen();
    expect(within(card).queryByText(/Ada|Kemi|Tunde/, hidden)).toBeNull();

    fireEvent.press(screen.getByTestId('match-result-share'));
    await waitFor(() =>
      expect(Sharing.shareAsync).toHaveBeenCalledWith('file://share-card.jpg', {
        mimeType: 'image/png',
        dialogTitle: 'Share your result',
      }),
    );
    await view.cleanup();
  });

  it('falls back to a sentence when the image cannot be made', async () => {
    (captureRef as jest.Mock).mockRejectedValueOnce(new Error('no surface'));
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    mockedApi.getMatch.mockResolvedValue(wonBoard());
    const view = renderWithClient(<MatchResultScreen matchId="m1" />);

    fireEvent.press(await screen.findByTestId('match-result-share'));

    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(share.mock.calls[0]?.[0]).toEqual({
      message: 'I won a 7-day walking group on Healthy.',
    });
    share.mockRestore();
    await view.cleanup();
  });

  it('runs it back with the same rules and people, through a saved crew', async () => {
    mockedApi.getMatch.mockResolvedValue(wonBoard());
    mockedApi.saveCrew.mockResolvedValue({ crew: { id: 'crew-1' }, alreadyExisted: true });
    mockedApi.createMatch.mockResolvedValue({
      match: liveBoard({ id: 'again' }),
      invite: { token: 't', url: 'u' },
    });
    const view = renderWithClient(<MatchResultScreen matchId="m1" />);

    fireEvent.press(await screen.findByTestId('match-run-it-back'));
    expect(await screen.findByText('Same again?')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('match-rerun-start'));

    await waitFor(() =>
      expect(mockedApi.createMatch).toHaveBeenCalledWith({
        window: 'week',
        metric: 'walk',
        scoringMode: 'cumulative_total',
        dailyScope: 'any_challenge',
        crewId: 'crew-1',
        parentMatchId: 'm1',
      }),
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/matches/again'));
    await view.cleanup();
  });
});
