import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import { consumeCaptureResult } from '@/lib/capture-session';
import { CaptureCameraScreen } from './CaptureCameraScreen';

const testSafeAreaMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

jest.mock('expo-router', () => {
  const mockBack = jest.fn();
  return {
    useRouter: () => ({ back: mockBack, push: jest.fn(), replace: jest.fn() }),
  };
});

jest.mock('@/lib/is-physical-device', () => ({
  isPhysicalDevice: () => true,
}));

jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');

  const CameraView = React.forwardRef(
    (props: Record<string, unknown>, ref: React.Ref<{ takePictureAsync: () => Promise<unknown> }>) => {
      React.useImperativeHandle(ref, () => ({
        takePictureAsync: jest.fn(async () => ({
          uri: 'file://shot.jpg',
          base64: 'bbbb',
        })),
      }));
      return React.createElement(View, { testID: 'camera-live', ...props });
    },
  );
  CameraView.displayName = 'CameraView';

  return {
    CameraView,
    useCameraPermissions: () => [
      { granted: true, canAskAgain: true },
      jest.fn(),
    ],
  };
});

function renderCamera() {
  return render(
    <SafeAreaProvider initialMetrics={testSafeAreaMetrics}>
      <CaptureCameraScreen challengeId="c-gym" intent="selfie" />
    </SafeAreaProvider>,
  );
}

describe('CaptureCameraScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consumeCaptureResult('c-gym');
  });

  it('stashes the take and returns to the waiting screen', async () => {
    renderCamera();

    fireEvent.press(screen.getByTestId('camera-shutter'));

    expect(await screen.findByTestId('camera-preview-image')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('camera-use-photo'));

    await waitFor(() => {
      expect(consumeCaptureResult('c-gym')).toEqual({
        mimeType: 'image/jpeg',
        imageBase64: 'bbbb',
        previewUri: 'file://shot.jpg',
      });
      expect(useRouter().back).toHaveBeenCalled();
    });
  });
});
