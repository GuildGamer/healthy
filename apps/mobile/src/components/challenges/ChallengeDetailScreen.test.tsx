import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { ActionSheetIOS } from 'react-native';
import {
  occurrenceDetail,
  todayChallenge,
  todayDetails,
} from '@/components/home/testing/today-fixtures';
import { apiClient } from '@/lib/api';
import { ChallengeDetailScreen } from './ChallengeDetailScreen';
import {
  catalogChallenge,
  catalogOutput,
  PUSHUPS_TWENTY,
  WALK_TEN,
} from './testing/catalog-fixtures';
import { renderScreen } from './testing/render-screen';

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    listChallengeCatalog: jest.fn(),
    listTodayChallenges: jest.fn(),
    getTodayDetails: jest.fn(),
    listChallengeHistory: jest.fn(),
    listTips: jest.fn(async () => ({ tips: [] })),
    setChallengeEnrollment: jest.fn(),
    addChallengeReminder: jest.fn(),
    removeChallengeReminder: jest.fn(),
    getPracticeTotals: jest.fn(),
  },
  apiQuery: {},
}));

jest.mock('expo-router', () => {
  const push = jest.fn();
  const replace = jest.fn();
  const back = jest.fn();
  return { useRouter: () => ({ push, replace, back, canGoBack: () => true }) };
});

jest.mock('@/lib/go-back', () => ({ goBackOrHome: jest.fn() }));

const mockedApi = apiClient as unknown as Record<keyof typeof apiClient, jest.Mock>;

const pushups = catalogChallenge({
  challengeId: 'push',
  title: 'Do 20 push-ups',
  isEnrolled: true,
  capture: PUSHUPS_TWENTY,
  reminders: [{ id: 'r1', minuteOfDay: 1080 }],
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedApi.listChallengeCatalog.mockResolvedValue(catalogOutput([pushups]));
  mockedApi.listTodayChallenges.mockResolvedValue({
    dayKey: '2026-08-28',
    challenges: [todayChallenge({ id: 'uc-push', challengeId: 'push', capture: PUSHUPS_TWENTY })],
    completedCount: 0,
    totalCount: 1,
  });
  mockedApi.getTodayDetails.mockResolvedValue(
    todayDetails([occurrenceDetail({ userChallengeId: 'uc-push', activeDayKeys: ['2026-08-25'] })]),
  );
  mockedApi.listChallengeHistory.mockResolvedValue({ challengeId: 'push', entries: [] });
  mockedApi.setChallengeEnrollment.mockResolvedValue(catalogOutput([pushups]));
});

describe('ChallengeDetailScreen', () => {
  it('shows the challenge with its week, settings and reminders', async () => {
    const view = renderScreen(<ChallengeDetailScreen challengeId="push" />);

    const hero = await screen.findByTestId('challenge-detail-hero');
    expect(within(hero).getByText('+150 a day')).toBeOnTheScreen();
    expect(await screen.findByTestId('deck-week-hit-2026-08-25')).toBeOnTheScreen();
    expect(screen.getByText('20 push-ups')).toBeOnTheScreen();
    expect(screen.getByText('Your camera')).toBeOnTheScreen();
    expect(screen.getByText('Evening, 18:00')).toBeOnTheScreen();
    expect(await screen.findByText('0 times')).toBeOnTheScreen();
    await view.settle();
  });

  it('saves how often as soon as it changes, and puts it back if that fails', async () => {
    const view = renderScreen(<ChallengeDetailScreen challengeId="push" />);
    await screen.findByTestId('challenge-settings');

    mockedApi.setChallengeEnrollment.mockRejectedValueOnce(new Error('offline'));
    fireEvent.press(screen.getByTestId('detail-frequency-weekly'));

    expect(await screen.findByText(/That didn’t save/)).toBeOnTheScreen();
    expect(mockedApi.setChallengeEnrollment).toHaveBeenCalledWith({
      challengeId: 'push',
      frequency: 'weekly',
      isEnrolled: true,
    });
    expect(screen.getByTestId('detail-frequency-daily')).toBeSelected();
    await view.settle();
  });

  it('changes the goal from its sheet', async () => {
    const view = renderScreen(<ChallengeDetailScreen challengeId="push" />);

    fireEvent.press(await screen.findByTestId('detail-goal'));
    fireEvent.press(await screen.findByTestId('goal-pick-30'));
    fireEvent.press(screen.getByTestId('goal-done'));

    await waitFor(() =>
      expect(mockedApi.setChallengeEnrollment).toHaveBeenCalledWith({
        challengeId: 'push',
        targetCount: 30,
        isEnrolled: true,
      }),
    );
    await view.settle();
  });

  it('lets a walker change their minutes', async () => {
    const walk = catalogChallenge({
      challengeId: 'walk',
      title: 'Take a ten-minute walk',
      isEnrolled: true,
      capture: WALK_TEN,
    });
    mockedApi.listChallengeCatalog.mockResolvedValue(catalogOutput([walk]));
    const view = renderScreen(<ChallengeDetailScreen challengeId="walk" />);

    fireEvent.press(await screen.findByTestId('detail-goal'));
    expect(await screen.findByText('Your walk goal')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('goal-pick-20'));
    fireEvent.press(screen.getByTestId('goal-done'));

    await waitFor(() =>
      expect(mockedApi.setChallengeEnrollment).toHaveBeenCalledWith({
        challengeId: 'walk',
        targetDurationMinutes: 20,
        isEnrolled: true,
      }),
    );
    await view.settle();
  });

  it('names the one-reminder limit plainly when a free member asks for more', async () => {
    const view = renderScreen(<ChallengeDetailScreen challengeId="push" />);

    const unlock = await screen.findByTestId('detail-unlock-reminders');
    expect(within(unlock).getByText('MEMBERS')).toBeOnTheScreen();
    fireEvent.press(unlock);

    expect(await screen.findByText('One reminder per challenge, for now.')).toBeOnTheScreen();
    await view.settle();
  });

  it('removes a reminder with its ×', async () => {
    mockedApi.removeChallengeReminder.mockResolvedValue({ challengeId: 'push', reminders: [] });
    const view = renderScreen(<ChallengeDetailScreen challengeId="push" />);

    fireEvent.press(await screen.findByTestId('detail-remove-reminder-1080'));

    await waitFor(() =>
      expect(mockedApi.removeChallengeReminder).toHaveBeenCalledWith({ reminderId: 'r1' }),
    );
    await view.settle();
  });

  it('asks before removing, saying what you keep', async () => {
    const actionSheet = jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation((_options, callback) => callback(0));
    mockedApi.setChallengeEnrollment.mockResolvedValue(catalogOutput([]));
    const view = renderScreen(<ChallengeDetailScreen challengeId="push" />);

    fireEvent.press(await screen.findByTestId('challenge-detail-stop'));

    expect(actionSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Remove Do 20 push-ups?',
        message: 'Your history and points stay. You can add it back any time.',
      }),
      expect.any(Function),
    );
    await waitFor(() =>
      expect(mockedApi.setChallengeEnrollment).toHaveBeenCalledWith({
        challengeId: 'push',
        isEnrolled: false,
      }),
    );
    await view.settle();
    actionSheet.mockRestore();
  });

  it('opens its history', async () => {
    const view = renderScreen(<ChallengeDetailScreen challengeId="push" />);

    fireEvent.press(await screen.findByTestId('detail-history'));

    expect(useRouter().push).toHaveBeenCalledWith('/challenge/push/history');
    await view.settle();
  });

  it('offers no extra set before today’s is done', async () => {
    const view = renderScreen(<ChallengeDetailScreen challengeId="push" />);

    await screen.findByTestId('challenge-settings');

    expect(screen.queryByTestId('detail-practice-again')).toBeNull();
    expect(mockedApi.getPracticeTotals).not.toHaveBeenCalled();
    await view.settle();
  });

  it('offers another set once today’s is done, with today’s extras under it', async () => {
    mockedApi.listTodayChallenges.mockResolvedValue({
      dayKey: '2026-08-28',
      challenges: [
        todayChallenge({
          id: 'uc-push',
          challengeId: 'push',
          capture: PUSHUPS_TWENTY,
          status: 'completed',
        }),
      ],
      completedCount: 1,
      totalCount: 1,
    });
    mockedApi.getPracticeTotals.mockResolvedValue({ todayCount: 15, todaySessions: 2 });
    const view = renderScreen(<ChallengeDetailScreen challengeId="push" />);

    expect(await screen.findByText('15 reps in 2 extra sets today')).toBeOnTheScreen();
    expect(mockedApi.getPracticeTotals).toHaveBeenCalledWith({ metric: 'pushups' });

    fireEvent.press(screen.getByTestId('detail-practice-again'));
    expect(useRouter().push).toHaveBeenCalledWith('/challenge/push/practice');
    await view.settle();
  });
});
