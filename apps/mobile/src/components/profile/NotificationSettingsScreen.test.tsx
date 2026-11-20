import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { apiClient } from '@/lib/api';
import { NotificationSettingsScreen } from './NotificationSettingsScreen';
import { meFixture, renderWithProviders } from './testing/settings-fixtures';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  router: { canDismiss: () => true, dismiss: jest.fn(), replace: jest.fn() },
}));

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    me: jest.fn(),
    listChallengeCatalog: jest.fn(async () => ({
      challenges: [
        {
          reminders: [
            { id: 'r1', minuteOfDay: 480 },
            { id: 'r2', minuteOfDay: 1_200 },
          ],
        },
      ],
      enrolledCount: 1,
      hasMembership: false,
      maxRemindersPerChallenge: 1,
    })),
    updateNotificationSettings: jest.fn(async () => ({})),
  },
  apiQuery: {},
}));

const mockedApi = jest.mocked(apiClient);

function renderScreen(overrides: Parameters<typeof meFixture>[0] = {}) {
  mockedApi.me.mockResolvedValue(meFixture(overrides));
  return renderWithProviders(<NotificationSettingsScreen />);
}

describe('NotificationSettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('asks before turning off photo checks, then saves the whole snapshot', async () => {
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId('toggle-evidence-reminders')).toHaveProp('value', true),
    );
    fireEvent(screen.getByTestId('toggle-evidence-reminders'), 'valueChange', false);

    expect(mockedApi.updateNotificationSettings).not.toHaveBeenCalled();
    expect(screen.getByText('Turn off photo check alerts?')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('confirm-photo-checks-off'));

    await waitFor(() =>
      expect(mockedApi.updateNotificationSettings).toHaveBeenCalledWith({
        reminderEnabled: true,
        evidenceRemindersEnabled: false,
        promotionalMessagesEnabled: false,
        showOnLeaderboard: true,
        groupNotificationsEnabled: true,
        inProgressNudgeEnabled: false,
        inProgressNudgeDelayMinutes: 30,
      }),
    );
  });

  it('shows a Members tag to a free account and opens Membership', async () => {
    renderScreen();

    expect(await screen.findByText('Members')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('toggle-in-progress-nudge'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/membership',
      params: { source: 'profile' },
    });
  });

  it('lets a member choose how long to wait', async () => {
    renderScreen({ hasMembership: true });

    fireEvent.press(await screen.findByText('After 30 minutes'));
    fireEvent.press(screen.getByTestId('nudge-delay-60'));
    fireEvent.press(screen.getByTestId('nudge-delay-done'));

    await waitFor(() =>
      expect(mockedApi.updateNotificationSettings).toHaveBeenCalledWith(
        expect.objectContaining({ inProgressNudgeEnabled: true, inProgressNudgeDelayMinutes: 60 }),
      ),
    );
  });

  it('counts the reminders set across challenges', async () => {
    renderScreen();

    expect(
      await screen.findByText('2 set, at the times you choose on each challenge'),
    ).toBeOnTheScreen();
  });

  it('turns group pushes off without asking, keeping the rest of the snapshot', async () => {
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId('toggle-group-notifications')).toHaveProp('value', true),
    );
    fireEvent(screen.getByTestId('toggle-group-notifications'), 'valueChange', false);

    await waitFor(() =>
      expect(mockedApi.updateNotificationSettings).toHaveBeenCalledWith(
        expect.objectContaining({ groupNotificationsEnabled: false, reminderEnabled: true }),
      ),
    );
  });

  it('says when the phone has turned notifications off', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
      granted: false,
      canAskAgain: false,
      status: Notifications.PermissionStatus?.DENIED ?? 'denied',
      expires: 'never',
    } as Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>);
    renderScreen();

    expect(await screen.findByTestId('notifications-off-on-phone')).toBeOnTheScreen();
    expect(screen.getByText('Open phone settings')).toBeOnTheScreen();
  });
});
