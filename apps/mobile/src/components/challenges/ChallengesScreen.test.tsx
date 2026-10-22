import { fireEvent, screen, within } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { todayChallenge, todayDetails } from '@/components/home/testing/today-fixtures';
import { apiClient } from '@/lib/api';
import { ChallengesScreen } from './ChallengesScreen';
import { catalogChallenge, catalogOutput } from './testing/catalog-fixtures';
import { renderScreen } from './testing/render-screen';

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    listChallengeCatalog: jest.fn(),
    listTodayChallenges: jest.fn(),
    getTodayDetails: jest.fn(),
    setChallengeEnrollment: jest.fn(),
  },
  apiQuery: {},
}));

jest.mock('expo-router', () => {
  const push = jest.fn();
  return { useRouter: () => ({ push }) };
});

const mockedApi = apiClient as unknown as Record<
  'listChallengeCatalog' | 'listTodayChallenges' | 'getTodayDetails' | 'setChallengeEnrollment',
  jest.Mock
>;

function today(challenges = [todayChallenge({ id: 'uc-walk', challengeId: 'walk' })]) {
  return { dayKey: '2026-08-28', challenges, completedCount: 0, totalCount: challenges.length };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedApi.listTodayChallenges.mockResolvedValue(today());
  mockedApi.getTodayDetails.mockResolvedValue(todayDetails([]));
});

describe('ChallengesScreen', () => {
  it('lists your routine by rhythm, with each row opening its settings', async () => {
    mockedApi.listChallengeCatalog.mockResolvedValue(
      catalogOutput([
        catalogChallenge({ challengeId: 'walk', title: 'Ten-minute walk', isEnrolled: true }),
        catalogChallenge({
          challengeId: 'weigh',
          title: 'Weekly weigh-in',
          isEnrolled: true,
          frequency: 'weekly',
        }),
        catalogChallenge({ challengeId: 'gym', title: 'Go to the gym' }),
      ]),
    );
    const view = renderScreen(<ChallengesScreen />);

    const daily = await screen.findByTestId('routine-daily');
    expect(within(daily).getByText('EVERY DAY')).toBeOnTheScreen();
    expect(within(daily).getByText('0 of 1 done')).toBeOnTheScreen();
    expect(screen.getByTestId('routine-weekly')).toBeOnTheScreen();
    expect(screen.queryByText('Go to the gym')).toBeNull();

    fireEvent.press(screen.getByTestId('open-challenge-walk'));
    expect(useRouter().push).toHaveBeenCalledWith('/challenge/walk');
    await view.settle();
  });

  it('offers the catalogue from one card when nothing is signed up', async () => {
    mockedApi.listChallengeCatalog.mockResolvedValue(
      catalogOutput([catalogChallenge({ challengeId: 'walk' })]),
    );
    const view = renderScreen(<ChallengesScreen />);

    expect(await screen.findByText('Your routine is empty.')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('routine-add'));
    expect(useRouter().push).toHaveBeenCalledWith('/manage-challenges');
    await view.settle();
  });

  it('says so when the list did not load, and tries again', async () => {
    mockedApi.listChallengeCatalog.mockRejectedValueOnce(new Error('offline'));
    const view = renderScreen(<ChallengesScreen />);

    expect(await screen.findByText('Your challenges didn’t load.')).toBeOnTheScreen();
    mockedApi.listChallengeCatalog.mockResolvedValue(catalogOutput([]));
    fireEvent.press(screen.getByTestId('routine-retry'));
    expect(await screen.findByText('Your routine is empty.')).toBeOnTheScreen();
    await view.settle();
  });

  it('keeps challenges paused by an ended membership, and explains them', async () => {
    mockedApi.listChallengeCatalog.mockResolvedValue(
      catalogOutput([
        catalogChallenge({ challengeId: 'walk', isEnrolled: true }),
        catalogChallenge({
          challengeId: 'gym',
          title: 'Go to the gym',
          isEnrolled: true,
          isLocked: true,
          requiresMembership: true,
        }),
      ]),
    );
    const view = renderScreen(<ChallengesScreen />);

    expect(await screen.findByText('Paused with membership')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('paused-challenge-gym'));
    expect(await screen.findByText('Paused with your membership.')).toBeOnTheScreen();

    mockedApi.setChallengeEnrollment.mockResolvedValue(catalogOutput([]));
    fireEvent.press(screen.getByTestId('paused-remove'));
    await view.settle();
    expect(mockedApi.setChallengeEnrollment).toHaveBeenCalledWith({
      challengeId: 'gym',
      isEnrolled: false,
    });
  });
});
