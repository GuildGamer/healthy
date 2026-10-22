import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProfilePhotoPreviewModal } from './ProfilePhotoPreviewModal';

function renderPreview(onClose: jest.Mock) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <ProfilePhotoPreviewModal imageUri="data:image/jpeg;base64,abcd" onClose={onClose} visible />
    </SafeAreaProvider>,
  );
}

describe('ProfilePhotoPreviewModal', () => {
  it('closes when the backdrop is pressed', () => {
    const onClose = jest.fn();
    renderPreview(onClose);

    fireEvent.press(screen.getByTestId('profile-photo-preview-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes when the close control is pressed', () => {
    const onClose = jest.fn();
    renderPreview(onClose);

    fireEvent.press(screen.getByTestId('profile-photo-preview-close'));
    expect(onClose).toHaveBeenCalled();
  });
});
