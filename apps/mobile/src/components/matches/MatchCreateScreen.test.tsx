import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { Share } from 'react-native';
import { apiClient } from '@/lib/api';
import { createPrefillFrom } from './group-rerun';
import { MatchCreateScreen } from './MatchCreateScreen';
import { liveBoard, renderWithClient } from './testing/match-fixtures';

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    createMatch: jest.fn(),
    listCrews: jest.fn(),
    listAcquaintances: jest.fn(),
    renameCrew: jest.fn(),
  },
  apiQuery: {},
}));

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, navigate: jest.fn() }),
  router: { replace: jest.fn(), canDismiss: () => false, dismiss: jest.fn() },
}));

const mockedApi = apiClient as unknown as {
  createMatch: jest.Mock;
  listCrews: jest.Mock;
  listAcquaintances: jest.Mock;
  renameCrew: jest.Mock;
};

describe('MatchCreateScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.listCrews.mockResolvedValue({ crews: [] });
    mockedApi.listAcquaintances.mockResolvedValue({ people: [] });
  });

  it('shows the invite friends will see, starting on a 7-day push-up total', async () => {
    const view = renderWithClient(<MatchCreateScreen prefill={createPrefillFrom({})} />);

    const card = screen.getByTestId('match-create-card');
    expect(within(card).getByText('Push-up total')).toBeOnTheScreen();
    expect(within(card).getByText('7 days')).toBeOnTheScreen();
    expect(within(card).getByText('Most push-ups in total wins.')).toBeOnTheScreen();
    await view.cleanup();
  });

  it('rewrites the card as the way to win changes, and dims what walking cannot run', async () => {
    const view = renderWithClient(<MatchCreateScreen prefill={createPrefillFrom({})} />);

    fireEvent.press(screen.getByTestId('match-create-activity'));
    const activitySheet = await screen.findByTestId('match-create-activity-sheet');
    fireEvent.press(within(activitySheet).getByTestId('match-metric-walk'));

    fireEvent.press(screen.getByTestId('match-create-mode'));
    const sheet = await screen.findByTestId('match-create-mode-sheet');
    expect(within(sheet).getByTestId('match-mode-best_single')).toBeDisabled();

    fireEvent.press(within(sheet).getByTestId('match-mode-days_completed'));
    expect(
      within(screen.getByTestId('match-create-card')).getByText('Most days showing up wins.'),
    ).toBeOnTheScreen();
    await view.cleanup();
  });

  it('starts the group and opens destinations on the board with its link', async () => {
    mockedApi.createMatch.mockResolvedValue({
      match: liveBoard({ id: 'new' }),
      invite: { token: 't', url: 'u' },
    });
    const view = renderWithClient(<MatchCreateScreen prefill={createPrefillFrom({})} />);

    fireEvent.press(screen.getByTestId('match-create-submit'));

    await waitFor(() =>
      expect(mockedApi.createMatch).toHaveBeenCalledWith({
        window: 'week',
        metric: 'pushups',
        scoringMode: 'cumulative_total',
        dailyScope: 'any_challenge',
      }),
    );
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/matches/[matchId]',
        params: { matchId: 'new', shareInvite: '1' },
      }),
    );
    await view.cleanup();
  });

  it('keeps every choice and says so when starting fails', async () => {
    mockedApi.createMatch.mockRejectedValue(new Error('offline'));
    const view = renderWithClient(<MatchCreateScreen prefill={createPrefillFrom({})} />);

    fireEvent.press(screen.getByTestId('match-create-submit'));

    expect(await screen.findByTestId('match-create-failed')).toBeOnTheScreen();
    expect(screen.getByText('Most push-ups in total wins.')).toBeOnTheScreen();
    await view.cleanup();
  });

  it('seats a saved crew without auto-sharing a link', async () => {
    mockedApi.listCrews.mockResolvedValue({
      crews: [
        {
          id: 'crew-1',
          name: 'Ada, Tunde',
          memberCount: 2,
          memberNames: ['Ada', 'Tunde'],
          isOwner: true,
        },
      ],
    });
    const view = renderWithClient(<MatchCreateScreen prefill={createPrefillFrom({})} />);

    await waitFor(() => expect(screen.getByTestId('match-create-crew')).toBeEnabled());
    fireEvent.press(screen.getByTestId('match-create-crew'));
    fireEvent.press(await screen.findByTestId('match-crew-crew-1'));

    expect(screen.getByText('Start group')).toBeOnTheScreen();
    await view.cleanup();
  });

  it('shows the most recent people until asked for all, keeping picks in view', async () => {
    mockedApi.listAcquaintances.mockResolvedValue({
      people: ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((userId) => ({
        userId,
        displayName: userId.toUpperCase(),
      })),
    });
    const view = renderWithClient(<MatchCreateScreen prefill={createPrefillFrom({})} />);

    await waitFor(() => expect(screen.getByTestId('match-create-crew')).toBeEnabled());
    fireEvent.press(screen.getByTestId('match-create-crew'));
    expect(await screen.findByTestId('match-person-e')).toBeOnTheScreen();
    expect(screen.queryByTestId('match-person-f')).toBeNull();

    fireEvent.press(screen.getByText('Show all 7'));
    fireEvent.press(screen.getByTestId('match-person-g'));
    fireEvent.press(screen.getByText('Show fewer'));

    expect(screen.queryByTestId('match-person-f')).toBeNull();
    expect(screen.getByTestId('match-person-g')).toBeOnTheScreen();
    await view.cleanup();
  });

  it('includes selected people and an optional title when creating', async () => {
    mockedApi.listAcquaintances.mockResolvedValue({
      people: [
        { userId: 'bee', displayName: 'Bee' },
        { userId: 'cam', displayName: 'Cam' },
      ],
    });
    mockedApi.createMatch.mockResolvedValue({
      match: liveBoard({ id: 'new' }),
      invite: { token: 't', url: 'u' },
    });
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    const view = renderWithClient(<MatchCreateScreen prefill={createPrefillFrom({})} />);

    fireEvent.changeText(screen.getByTestId('match-create-title'), 'Acme March challenge');
    await waitFor(() => expect(screen.getByTestId('match-create-crew')).toBeEnabled());
    fireEvent.press(screen.getByTestId('match-create-crew'));
    fireEvent.press(await screen.findByTestId('match-person-bee'));
    fireEvent.press(screen.getByTestId('match-person-cam'));
    fireEvent.press(screen.getByTestId('match-create-submit'));

    await waitFor(() =>
      expect(mockedApi.createMatch).toHaveBeenCalledWith(
        expect.objectContaining({
          participantUserIds: ['bee', 'cam'],
          title: 'Acme March challenge',
        }),
      ),
    );
    expect(share).not.toHaveBeenCalled();
    share.mockRestore();
    await view.cleanup();
  });

  it('offers only crews this person owns', async () => {
    mockedApi.listCrews.mockResolvedValue({
      crews: [
        {
          id: 'crew-owned',
          name: 'Ada, Tunde',
          memberCount: 2,
          memberNames: ['Ada', 'Tunde'],
          isOwner: true,
        },
        {
          id: 'crew-theirs',
          name: 'Cam’s crew',
          memberCount: 1,
          memberNames: ['Cam'],
          isOwner: false,
        },
      ],
    });
    const view = renderWithClient(<MatchCreateScreen prefill={createPrefillFrom({})} />);

    await waitFor(() => expect(screen.getByTestId('match-create-crew')).toBeEnabled());
    fireEvent.press(screen.getByTestId('match-create-crew'));

    expect(await screen.findByTestId('match-crew-crew-owned')).toBeOnTheScreen();
    expect(screen.queryByTestId('match-crew-crew-theirs')).toBeNull();
    await view.cleanup();
  });

  it('sends a prefilled crew only when the loaded list says this person owns it', async () => {
    mockedApi.listCrews.mockResolvedValue({
      crews: [
        {
          id: 'crew-owned',
          name: 'Ada, Tunde',
          memberCount: 2,
          memberNames: ['Ada', 'Tunde'],
          isOwner: true,
        },
      ],
    });
    mockedApi.createMatch.mockResolvedValue({
      match: liveBoard({ id: 'new' }),
      invite: { token: 't', url: 'u' },
    });
    const view = renderWithClient(
      <MatchCreateScreen
        prefill={createPrefillFrom({ metric: 'pushups', crewId: 'crew-owned' })}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('match-create-crew')).toBeEnabled());
    fireEvent.press(screen.getByTestId('match-create-submit'));

    await waitFor(() =>
      expect(mockedApi.createMatch).toHaveBeenCalledWith(
        expect.objectContaining({ crewId: 'crew-owned' }),
      ),
    );
    await view.cleanup();
  });

  it('drops a prefilled crew that this person does not own', async () => {
    mockedApi.listCrews.mockResolvedValue({
      crews: [
        {
          id: 'crew-theirs',
          name: 'Cam’s crew',
          memberCount: 1,
          memberNames: ['Cam'],
          isOwner: false,
        },
      ],
    });
    mockedApi.createMatch.mockResolvedValue({
      match: liveBoard({ id: 'new' }),
      invite: { token: 't', url: 'u' },
    });
    const view = renderWithClient(
      <MatchCreateScreen
        prefill={createPrefillFrom({ metric: 'pushups', crewId: 'crew-theirs' })}
      />,
    );

    // No owned crew means Who’s in stays disabled; wait for the link CTA instead.
    await waitFor(() => expect(screen.getByText('Start and share link')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('match-create-submit'));

    await waitFor(() =>
      expect(mockedApi.createMatch).toHaveBeenCalledWith({
        window: 'week',
        metric: 'pushups',
        scoringMode: 'cumulative_total',
        dailyScope: 'any_challenge',
      }),
    );
    expect(mockedApi.createMatch.mock.calls[0][0]).not.toHaveProperty('crewId');
    await view.cleanup();
  });

  it('clears a gone crew after NOT_FOUND so the next start omits it', async () => {
    mockedApi.listCrews.mockResolvedValue({
      crews: [
        {
          id: 'crew-gone',
          name: 'Ada, Tunde',
          memberCount: 2,
          memberNames: ['Ada', 'Tunde'],
          isOwner: true,
        },
      ],
    });
    mockedApi.createMatch
      .mockRejectedValueOnce(Object.assign(new Error('That crew was not found.'), { code: 'NOT_FOUND' }))
      .mockResolvedValueOnce({
        match: liveBoard({ id: 'new' }),
        invite: { token: 't', url: 'u' },
      });
    const view = renderWithClient(
      <MatchCreateScreen
        prefill={createPrefillFrom({ metric: 'pushups', crewId: 'crew-gone' })}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('match-create-crew')).toBeEnabled());
    fireEvent.press(screen.getByTestId('match-create-submit'));

    expect(
      await screen.findByText('That crew is gone. Start again without it, or pick another.'),
    ).toBeOnTheScreen();

    mockedApi.listCrews.mockResolvedValue({ crews: [] });
    fireEvent.press(screen.getByTestId('match-create-submit'));

    await waitFor(() =>
      expect(mockedApi.createMatch).toHaveBeenLastCalledWith({
        window: 'week',
        metric: 'pushups',
        scoringMode: 'cumulative_total',
        dailyScope: 'any_challenge',
      }),
    );
    expect(mockedApi.createMatch.mock.calls.at(-1)?.[0]).not.toHaveProperty('crewId');
    await view.cleanup();
  });
});
