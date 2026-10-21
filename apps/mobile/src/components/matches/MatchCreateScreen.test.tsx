import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Metrics } from 'react-native-safe-area-context';
import { apiClient } from '@/lib/api';
import { MATCH_ANY_DAILY_LABEL } from './match-metric';
import { MatchCreateScreen } from './MatchCreateScreen';

const testSafeAreaMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    createMatch: jest.fn(),
    listCrews: jest.fn(),
  },
  apiQuery: {},
}));

jest.mock('expo-router', () => {
  const replace = jest.fn();
  return {
    useRouter: () => ({ replace }),
  };
});

const mockedApi = apiClient as unknown as {
  createMatch: jest.Mock;
  listCrews: jest.Mock;
};

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });

  render(
    <QueryClientProvider client={client}>
      <SafeAreaProvider initialMetrics={testSafeAreaMetrics}>
        <MatchCreateScreen />
      </SafeAreaProvider>
    </QueryClientProvider>,
  );

  return { cleanup: () => client.clear() };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedApi.listCrews.mockResolvedValue({ crews: [] });
  mockedApi.createMatch.mockResolvedValue({
    match: { id: 'm1' },
    invite: { token: 'tok', url: 'https://gethealthyapp.com/match/tok' },
  });
});

describe('MatchCreateScreen', () => {
  it('creates a today match and shares the invite link', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({
      action: Share.sharedAction,
    });
    const { cleanup } = renderScreen();

    fireEvent.press(screen.getByTestId('match-create-submit'));

    await waitFor(() => {
      expect(mockedApi.createMatch).toHaveBeenCalledWith({
        window: 'today',
        metric: 'pushups',
        scoringMode: 'best_single',
        dailyScope: 'any_challenge',
      });
    });
    expect(share).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledWith({
      url: 'https://gethealthyapp.com/match/tok',
    });

    cleanup();
    share.mockRestore();
  });

  // A walk has no "best set", so picking it has to move the mode rather than
  // let the host submit a pair the API will reject.
  it('drops best set when the host switches to walking', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({
      action: Share.sharedAction,
    });
    const { cleanup } = renderScreen();

    fireEvent.press(screen.getByTestId('match-metric-walk'));

    expect(screen.queryByTestId('match-mode-best_single')).toBeNull();

    fireEvent.press(screen.getByTestId('match-create-submit'));

    await waitFor(() => {
      expect(mockedApi.createMatch).toHaveBeenCalledWith({
        window: 'today',
        metric: 'walk',
        scoringMode: 'cumulative_total',
        dailyScope: 'any_challenge',
      });
    });

    cleanup();
    share.mockRestore();
  });

  // A streak can be raced on one habit or on showing up at all, so the
  // activity picker gains the open option rather than disappearing.
  it('offers every activity plus the open option for a streak', () => {
    const { cleanup } = renderScreen();

    fireEvent.press(screen.getByTestId('match-mode-days_completed'));

    expect(screen.getByTestId('match-metric-pushups')).toBeTruthy();
    expect(screen.getByTestId('match-metric-walk')).toBeTruthy();
    expect(screen.getByTestId('match-metric-any')).toBeTruthy();

    cleanup();
  });

  it('sends the scoring mode the host picked', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({
      action: Share.sharedAction,
    });
    const { cleanup } = renderScreen();

    fireEvent.press(screen.getByTestId('match-mode-cumulative_total'));
    fireEvent.press(screen.getByTestId('match-create-submit'));

    await waitFor(() => {
      expect(mockedApi.createMatch).toHaveBeenCalledWith({
        window: 'today',
        metric: 'pushups',
        scoringMode: 'cumulative_total',
        dailyScope: 'any_challenge',
      });
    });

    cleanup();
    share.mockRestore();
  });

  it('sends a custom length in days instead of a preset window', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({
      action: Share.sharedAction,
    });
    const { cleanup } = renderScreen();

    fireEvent.press(screen.getByTestId('match-window-custom'));
    fireEvent.press(screen.getByTestId('match-window-days-inc'));
    fireEvent.press(screen.getByTestId('match-create-submit'));

    await waitFor(() => {
      expect(mockedApi.createMatch).toHaveBeenCalledWith({
        durationDays: 61,
        metric: 'pushups',
        scoringMode: 'best_single',
        dailyScope: 'any_challenge',
      });
    });

    cleanup();
    share.mockRestore();
  });

  // Stepping from the presets to a season would be hundreds of taps, so the
  // readout takes a typed value.
  it('takes a typed length beyond what the presets offer', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({
      action: Share.sharedAction,
    });
    const { cleanup } = renderScreen();

    fireEvent.press(screen.getByTestId('match-window-custom'));
    fireEvent.changeText(screen.getByTestId('match-window-days-value'), '180');
    fireEvent(screen.getByTestId('match-window-days-value'), 'blur');
    fireEvent.press(screen.getByTestId('match-create-submit'));

    await waitFor(() => {
      expect(mockedApi.createMatch).toHaveBeenCalledWith({
        durationDays: 180,
        metric: 'pushups',
        scoringMode: 'best_single',
        dailyScope: 'any_challenge',
      });
    });

    cleanup();
    share.mockRestore();
  });

  it('holds a typed length inside the range the contract accepts', async () => {
    const { cleanup } = renderScreen();

    fireEvent.press(screen.getByTestId('match-window-custom'));
    fireEvent.changeText(screen.getByTestId('match-window-days-value'), '900');
    fireEvent(screen.getByTestId('match-window-days-value'), 'blur');

    expect(screen.getByTestId('match-window-days-value').props.value).toBe('365');

    cleanup();
  });

  // A streak opens the board to everyone's routine by default, so picking
  // that mode has to move the selection off the activity it started on.
  it('opens a streak up to any daily challenge', async () => {
    const { cleanup } = renderScreen();

    expect(screen.queryByTestId('match-metric-any')).toBeNull();

    fireEvent.press(screen.getByTestId('match-mode-days_completed'));

    expect(screen.getByText(MATCH_ANY_DAILY_LABEL)).toBeOnTheScreen();
    expect(
      screen.getByTestId('match-metric-any').props.accessibilityState.selected,
    ).toBe(true);
    expect(
      screen.getByTestId('match-metric-pushups').props.accessibilityState
        .selected,
    ).toBe(false);

    cleanup();
  });

  it('sends a streak narrowed to one activity', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({
      action: Share.sharedAction,
    });
    const { cleanup } = renderScreen();

    fireEvent.press(screen.getByTestId('match-mode-days_completed'));
    fireEvent.press(screen.getByTestId('match-metric-walk'));
    fireEvent.press(screen.getByTestId('match-create-submit'));

    await waitFor(() => {
      expect(mockedApi.createMatch).toHaveBeenCalledWith({
        window: 'week',
        metric: 'walk',
        scoringMode: 'days_completed',
        dailyScope: 'chosen_activity',
      });
    });

    cleanup();
    share.mockRestore();
  });

  // The options are bare labels now, so the sentence is the only thing that
  // explains the contest — it has to follow every pick.
  it('rewrites the summary as the host picks', () => {
    const { cleanup } = renderScreen();

    expect(screen.getByTestId('match-setup-summary')).toHaveTextContent(/A one-day push-up contest\./);

    fireEvent.press(screen.getByTestId('match-mode-days_completed'));
    fireEvent.press(screen.getByTestId('match-metric-walk'));

    expect(screen.getByTestId('match-setup-summary')).toHaveTextContent(/A 7-day walking streak\./);

    cleanup();
  });

  it('drops a length the chosen mode cannot run', async () => {
    const { cleanup } = renderScreen();

    expect(screen.getByTestId('match-window-today')).toBeOnTheScreen();

    // Consistency has no one-day option, so today must disappear rather than
    // stay selected and be rejected by the API.
    fireEvent.press(screen.getByTestId('match-mode-days_completed'));

    expect(screen.queryByTestId('match-window-today')).toBeNull();
    expect(screen.getByTestId('match-window-week')).toBeOnTheScreen();

    cleanup();
  });

  it('hides the crew row until there is a crew to pick', async () => {
    const { cleanup } = renderScreen();

    await waitFor(() => {
      expect(mockedApi.listCrews).toHaveBeenCalled();
    });
    expect(screen.queryByTestId('match-crew-new')).toBeNull();

    cleanup();
  });

  it('seats a saved crew and skips the share sheet, since there is no link to send', async () => {
    mockedApi.listCrews.mockResolvedValue({
      crews: [
        {
          id: 'crew-1',
          name: 'Bee, Cam',
          memberCount: 2,
          memberNames: ['Bee', 'Cam'],
          isOwner: true,
        },
      ],
    });
    const share = jest.spyOn(Share, 'share').mockResolvedValue({
      action: Share.sharedAction,
    });
    const { cleanup } = renderScreen();

    fireEvent.press(await screen.findByTestId('match-crew-crew-1'));
    fireEvent.press(screen.getByTestId('match-create-submit'));

    await waitFor(() => {
      expect(mockedApi.createMatch).toHaveBeenCalledWith({
        window: 'today',
        metric: 'pushups',
        scoringMode: 'best_single',
        dailyScope: 'any_challenge',
        crewId: 'crew-1',
      });
    });
    expect(share).not.toHaveBeenCalled();

    cleanup();
    share.mockRestore();
  });
});
