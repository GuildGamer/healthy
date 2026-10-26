import { act, renderHook } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { usePushResponse } from './use-push-response';

jest.mock('expo-router', () => ({
  router: { navigate: jest.fn() },
}));

jest.mock('./track-event', () => ({
  trackEvent: jest.fn(),
}));

const mockedNotifications = Notifications as jest.Mocked<typeof Notifications>;
const mockedNavigate = router.navigate as jest.Mock;

type ResponseListener = (response: Notifications.NotificationResponse) => void;

function pushResponse(
  identifier: string,
  data: Record<string, unknown>,
): Notifications.NotificationResponse {
  return {
    notification: { request: { identifier, content: { data } } },
  } as unknown as Notifications.NotificationResponse;
}

function captureTapListener(): () => ResponseListener {
  let listener: ResponseListener | null = null;
  mockedNotifications.addNotificationResponseReceivedListener.mockImplementation((callback) => {
    listener = callback;
    return { remove: jest.fn() };
  });

  return () => {
    if (!listener) {
      throw new Error('usePushResponse did not subscribe to taps');
    }
    return listener;
  };
}

const challengeReminder = { destination: 'challenge', challengeId: 'challenge-1' };
const todayFocusHref = { pathname: '/(tabs)', params: { focus: 'challenge-1' } };

describe('usePushResponse', () => {
  beforeEach(() => {
    mockedNavigate.mockClear();
    mockedNotifications.getLastNotificationResponseAsync.mockResolvedValue(null);
  });

  it('holds a cold-start tap until launch has left the root route', async () => {
    mockedNotifications.getLastNotificationResponseAsync.mockResolvedValue(
      pushResponse('cold-1', challengeReminder),
    );

    const { rerender } = renderHook(
      ({ canNavigate }: { canNavigate: boolean }) => usePushResponse(canNavigate),
      { initialProps: { canNavigate: false } },
    );
    await act(async () => {});

    expect(mockedNavigate).not.toHaveBeenCalled();

    rerender({ canNavigate: true });

    expect(mockedNavigate).toHaveBeenCalledTimes(1);
    expect(mockedNavigate).toHaveBeenCalledWith(todayFocusHref);
  });

  it('opens a warm tap straight away', () => {
    const tapListener = captureTapListener();
    renderHook(() => usePushResponse(true));

    act(() => {
      tapListener()(pushResponse('warm-1', challengeReminder));
    });

    expect(mockedNavigate).toHaveBeenCalledWith(todayFocusHref);
  });

  it('opens a response once when both the launch read and the listener deliver it', async () => {
    const response = pushResponse('same-1', challengeReminder);
    mockedNotifications.getLastNotificationResponseAsync.mockResolvedValue(response);
    const tapListener = captureTapListener();

    renderHook(() => usePushResponse(true));
    await act(async () => {});
    act(() => {
      tapListener()(response);
    });

    expect(mockedNavigate).toHaveBeenCalledTimes(1);
  });
});
