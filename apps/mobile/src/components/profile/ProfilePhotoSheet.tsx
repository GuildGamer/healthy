import { SettingsActionSheet, type SettingsSheetAction } from '@/components/settings';
import type { useUpdateProfilePhoto } from './useUpdateProfilePhoto';

type ProfilePhoto = ReturnType<typeof useUpdateProfilePhoto>;

/** Take one or choose one; once there is a photo, Remove joins the list. */
export function ProfilePhotoSheet({ photo, hasPhoto }: { photo: ProfilePhoto; hasPhoto: boolean }) {
  const actions: SettingsSheetAction[] = [
    {
      label: 'Take photo',
      onPress: () => void photo.pickFrom('camera'),
      testID: 'change-photo-camera',
    },
    {
      label: 'Choose from library',
      onPress: () => void photo.pickFrom('library'),
      testID: 'change-photo-library',
    },
  ];

  if (hasPhoto) {
    actions.push({
      label: 'Remove photo',
      onPress: photo.removePhoto,
      isDestructive: true,
      testID: 'change-photo-remove',
    });
  }

  return (
    <SettingsActionSheet
      actions={actions}
      body="Others see it next to your name."
      onCancel={photo.closeSheet}
      testID="change-photo-sheet"
      title="Your photo"
      visible={photo.sheetOpen}
    />
  );
}
