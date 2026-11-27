import { fireEvent, render, screen } from '@testing-library/react-native';
import { ProfileAvatar } from './ProfileAvatar';

describe('ProfileAvatar', () => {
  it('opens preview from the face when a photo is set', () => {
    const onPreviewPress = jest.fn();
    const onEditPress = jest.fn();

    render(
      <ProfileAvatar
        imageUri="data:image/jpeg;base64,abcd"
        name="Ada"
        onEditPress={onEditPress}
        onPreviewPress={onPreviewPress}
        testID="profile-avatar"
      />,
    );

    fireEvent.press(screen.getByTestId('profile-avatar-preview'));
    expect(onPreviewPress).toHaveBeenCalledTimes(1);
    expect(onEditPress).not.toHaveBeenCalled();
  });

  it('opens the edit sheet from the badge only', () => {
    const onPreviewPress = jest.fn();
    const onEditPress = jest.fn();

    render(
      <ProfileAvatar
        imageUri="data:image/jpeg;base64,abcd"
        name="Ada"
        onEditPress={onEditPress}
        onPreviewPress={onPreviewPress}
        testID="profile-avatar"
      />,
    );

    fireEvent.press(screen.getByTestId('profile-avatar-edit'));
    expect(onEditPress).toHaveBeenCalledTimes(1);
    expect(onPreviewPress).not.toHaveBeenCalled();
  });

  it('does not offer preview without a photo', () => {
    render(
      <ProfileAvatar
        name="Ada"
        onEditPress={jest.fn()}
        onPreviewPress={jest.fn()}
        testID="profile-avatar"
      />,
    );

    expect(screen.queryByTestId('profile-avatar-preview')).toBeNull();
    expect(screen.getByTestId('profile-avatar')).toBeOnTheScreen();
  });
});
