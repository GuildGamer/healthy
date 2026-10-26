import { fireEvent, screen, within } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { apiClient } from '@/lib/api';
import { AddChallengeScreen } from './AddChallengeScreen';
import { catalogChallenge, catalogOutput, PUSHUPS_TWENTY } from './testing/catalog-fixtures';
import { renderScreen } from './testing/render-screen';

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    listChallengeCatalog: jest.fn(),
    me: jest.fn(),
    setChallengeEnrollment: jest.fn(),
    addChallengeReminder: jest.fn(),
  },
  apiQuery: {},
}));

jest.mock('expo-router', () => {
  const push = jest.fn();
  const navigate = jest.fn();
  const back = jest.fn();
  return { useRouter: () => ({ push, navigate, back, canGoBack: () => true }) };
});

const mockedApi = apiClient as unknown as Record<
  'listChallengeCatalog' | 'me' | 'setChallengeEnrollment' | 'addChallengeReminder',
  jest.Mock
>;

const catalog = catalogOutput([
  catalogChallenge({
    challengeId: 'push',
    title: 'Do 20 push-ups',
    category: 'general',
    sortOrder: 1,
    capture: PUSHUPS_TWENTY,
    description: 'Twenty in one go.',
  }),
  catalogChallenge({
    challengeId: 'walk',
    title: 'Ten-minute walk',
    category: 'general',
    sortOrder: 2,
  }),
  catalogChallenge({
    challengeId: 'gym',
    title: 'Go to the gym',
    category: 'general',
    sortOrder: 3,
    completionKind: 'evidence_photo',
    isLocked: true,
    requiresMembership: true,
  }),
  catalogChallenge({ challengeId: 'inhaler', title: 'Preventer inhaler', category: 'asthma' }),
  catalogChallenge({ challengeId: 'water', title: 'Log your water', isEnrolled: true }),
]);

beforeEach(() => {
  jest.clearAllMocks();
  mockedApi.listChallengeCatalog.mockResolvedValue(catalog);
  mockedApi.me.mockResolvedValue({ categories: ['general'] });
});

describe('AddChallengeScreen', () => {
  it('suggests two to add, then lists the rest with members-only ones tagged', async () => {
    const view = renderScreen(<AddChallengeScreen />);

    const suggestions = await screen.findByTestId('catalog-suggestions');
    expect(within(suggestions).getByText('Do 20 push-ups')).toBeOnTheScreen();
    expect(within(suggestions).getByText('Ten-minute walk')).toBeOnTheScreen();
    const gym = screen.getByTestId('catalog-challenge-gym');
    expect(within(gym).getByText('MEMBERS')).toBeOnTheScreen();
    expect(screen.queryByText('Log your water')).toBeNull();
    await view.settle();
  });

  it('offers no condition filters while conditions are out of product scope', async () => {
    const view = renderScreen(<AddChallengeScreen />);
    await screen.findByTestId('catalog-suggestions');

    expect(screen.queryByTestId('catalog-chips')).toBeNull();
    await view.settle();
  });

  it('previews a challenge with its settings filled in, and adds it in one tap', async () => {
    mockedApi.setChallengeEnrollment.mockResolvedValue(catalog);
    mockedApi.addChallengeReminder.mockResolvedValue({ challengeId: 'push', reminders: [] });
    const view = renderScreen(<AddChallengeScreen />);

    fireEvent.press(await screen.findByTestId('catalog-suggestion-push'));
    const preview = await screen.findByTestId('catalog-preview');
    expect(within(preview).getByText('Twenty in one go.')).toBeOnTheScreen();
    expect(within(preview).getByText('Evening, 18:00')).toBeOnTheScreen();
    expect(within(preview).getByText('20 push-ups')).toBeOnTheScreen();

    fireEvent.press(within(preview).getByTestId('preview-frequency-weekly'));
    fireEvent.press(within(preview).getByTestId('preview-add'));

    expect(await screen.findByText('Added to this week')).toBeOnTheScreen();
    expect(mockedApi.setChallengeEnrollment).toHaveBeenCalledWith({
      challengeId: 'push',
      isEnrolled: true,
      frequency: 'weekly',
    });
    expect(mockedApi.addChallengeReminder).toHaveBeenCalledWith({
      challengeId: 'push',
      minuteOfDay: 1080,
    });
    fireEvent.press(screen.getByTestId('catalog-toast-action'));
    expect(useRouter().navigate).toHaveBeenCalledWith('/(tabs)');
    await view.settle();
  });

  it('lets you pick another reminder moment before adding', async () => {
    const view = renderScreen(<AddChallengeScreen />);

    fireEvent.press(await screen.findByTestId('catalog-suggestion-push'));
    fireEvent.press(await screen.findByTestId('preview-reminder'));
    fireEvent.press(screen.getByTestId('reminder-moment-morning'));
    fireEvent.press(screen.getByTestId('reminder-save'));

    expect(await screen.findByText('Morning, 08:00')).toBeOnTheScreen();
    await view.settle();
  });

  it('explains a members-only challenge before offering membership', async () => {
    const view = renderScreen(<AddChallengeScreen />);

    fireEvent.press(await screen.findByTestId('catalog-challenge-gym'));
    const preview = await screen.findByTestId('catalog-preview');

    expect(within(preview).getByText('Part of membership')).toBeOnTheScreen();
    expect(within(preview).queryByTestId('preview-add')).toBeNull();
    fireEvent.press(within(preview).getByTestId('preview-membership'));
    expect(useRouter().push).toHaveBeenCalledWith({
      pathname: '/membership',
      params: { source: 'other' },
    });
    await view.settle();
  });
});
