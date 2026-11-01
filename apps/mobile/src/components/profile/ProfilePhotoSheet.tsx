import { DeckChoiceSheet, type DeckChoiceAction } from '@/components/deck';
import type { useUpdateProfilePhoto } from './useUpdateProfilePhoto';

type ProfilePhoto = ReturnType<typeof useUpdateProfilePhoto>;

/** Take one or choose one; once there is a photo, Remove joins the list. */
export function ProfilePhotoSheet({ photo, hasPhoto }: { photo: ProfilePhoto; hasPhoto: boolean }) {
  const actions: DeckChoiceAction[] = [
    {
      label: 'Take photo',
      onPress: () => photo.pickFrom('camera'),
      testID: 'change-photo-camera',
    },
    {
      label: 'Choose from library',
      onPress: () => photo.pickFrom('library'),
      testID: 'change-photo-library',
    },
  ];

  if (hasPhoto) {
    actions.push({
      label: 'Remove photo',
      onPress: photo.removePhoto,
      isDanger: true,
      testID: 'change-photo-remove',
    });
  }

  return (
    <DeckChoiceSheet
      actions={actions}
      body="Others see it next to your name."
      closeLabel="Cancel"
      closeTestID="change-photo-sheet-cancel"
      onClose={photo.closeSheet}
      onHidden={photo.onSheetHidden}
      testID="change-photo-sheet"
      title="Your photo"
      visible={photo.sheetOpen}
    />
  );
}
