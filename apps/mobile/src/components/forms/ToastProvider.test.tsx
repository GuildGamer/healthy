import { fireEvent, render, screen, act } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Metrics } from 'react-native-safe-area-context';
import {
  ToastProvider,
  TOAST_AUTO_HIDE_MS,
  useToast,
} from './ToastProvider';
import type { ToastTone } from './types';

const testSafeAreaMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Trigger({
  message,
  tone,
}: {
  message: string;
  tone?: ToastTone;
}) {
  const toast = useToast();

  return (
    <Pressable
      onPress={() => toast.show({ message, tone })}
      testID="show-toast"
    >
      <Text>Show</Text>
    </Pressable>
  );
}

function renderHost(tone?: ToastTone) {
  return render(
    <SafeAreaProvider initialMetrics={testSafeAreaMetrics}>
      <ToastProvider>
        <Trigger message="Could not save" tone={tone} />
      </ToastProvider>
    </SafeAreaProvider>,
  );
}

describe('ToastProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('hides a toast after the auto-dismiss window', () => {
    renderHost('success');

    fireEvent.press(screen.getByTestId('show-toast'));
    expect(screen.getByTestId('toast-banner')).toBeOnTheScreen();

    act(() => {
      jest.advanceTimersByTime(TOAST_AUTO_HIDE_MS);
    });

    expect(screen.queryByTestId('toast-banner')).toBeNull();
  });

  it('also hides error toasts after the same window', () => {
    renderHost('error');

    fireEvent.press(screen.getByTestId('show-toast'));
    expect(screen.getByTestId('toast-banner')).toBeOnTheScreen();

    act(() => {
      jest.advanceTimersByTime(TOAST_AUTO_HIDE_MS - 1);
    });
    expect(screen.getByTestId('toast-banner')).toBeOnTheScreen();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.queryByTestId('toast-banner')).toBeNull();
  });
});
