import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import { CaptureCameraScreen } from './CaptureCameraScreen';

const testSafeAreaMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

jest.mock('@/lib/is-physical-device', () => ({
  isPhysicalDevice: () => true,
}));

jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');

  const CameraView = React.forwardRef(
    (
      props: Record<string, unknown>,
      ref: React.Ref<{ takePictureAsync: () => Promise<unknown> }>,
    ) => {
      React.useImperativeHandle(ref, () => ({
        takePictureAsync: jest.fn(async () => ({
          uri: 'file://shot.jpg',
          base64: 'bbbb',
          width: 3024,
          height: 4032,
        })),
      }));
      return React.createElement(View, { testID: 'camera-live', ...props });
    },
  );
  CameraView.displayName = 'CameraView';

  return {
    CameraView,
    useCameraPermissions: () => [{ granted: true, canAskAgain: true }, jest.fn()],
  };
});

function renderCamera(overrides: Partial<Parameters<typeof CaptureCameraScreen>[0]> = {}) {
  const onUse = jest.fn();
  const onRetake = jest.fn();
  render(
    <SafeAreaProvider initialMetrics={testSafeAreaMetrics}>
      <CaptureCameraScreen
        checkError={null}
        facing="front"
        hint="Your face, with the gym behind you"
        isChecking={false}
        onClose={jest.fn()}
        onRetake={onRetake}
        onUse={onUse}
        pill={{ glyph: 'gym', label: 'Gym check-in' }}
        {...overrides}
      />
    </SafeAreaProvider>,
  );
  return { onUse, onRetake };
}

describe('CaptureCameraScreen', () => {
  it('keeps the front preview natural so the take is not mirrored', () => {
    renderCamera();

    expect(screen.getByTestId('camera-live')).toHaveProp('mirror', false);
    expect(screen.getByTestId('camera-live')).toHaveStyle({ transform: [{ scaleX: -1 }] });
  });

  it('says what has to be in the frame, then shows the take full size', async () => {
    const { onUse } = renderCamera();

    expect(screen.getByText('Your face, with the gym behind you')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('camera-shutter'));

    expect(await screen.findByTestId('camera-preview-image')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('camera-use-photo'));

    expect(onUse).toHaveBeenCalledWith({
      mimeType: 'image/jpeg',
      imageBase64: 'bbbb',
      previewUri: 'file://shot.jpg',
      width: 3024,
      height: 4032,
    });
  });

  it('goes back to the camera on Retake and drops the last check result', async () => {
    const { onRetake } = renderCamera();

    fireEvent.press(screen.getByTestId('camera-shutter'));
    fireEvent.press(await screen.findByTestId('camera-retake'));

    expect(screen.getByTestId('camera-shutter')).toBeOnTheScreen();
    expect(onRetake).toHaveBeenCalledTimes(1);
  });

  it('offers only Retake once a photo has not passed', async () => {
    renderCamera({ checkError: 'We couldn’t see you at the gym in that one.' });

    fireEvent.press(screen.getByTestId('camera-shutter'));

    expect(
      await screen.findByText('We couldn’t see you at the gym in that one.'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('camera-use-photo')).toBeNull();
  });
});
