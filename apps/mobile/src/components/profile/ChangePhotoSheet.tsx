import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { FormButton, FormErrorBanner } from '@/components/forms';
import type { ProfilePhotoSource } from '@/lib/pick-profile-photo';

export function ChangePhotoSheet({
  errorMessage,
  isSaving,
  onClose,
  onPick,
  visible,
}: {
  errorMessage: string | null;
  isSaving: boolean;
  onClose: () => void;
  onPick: (source: ProfilePhotoSource) => void;
  visible: boolean;
}) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <Pressable onPress={onClose} style={styles.backdrop} />
      <View style={styles.sheet} testID="change-photo-sheet">
        <Text style={styles.title}>Profile photo</Text>
        <Text style={styles.body}>
          Take a new one or choose from your library. This is the face on your
          profile.
        </Text>
        {errorMessage ? <FormErrorBanner message={errorMessage} /> : null}
        <FormButton
          label="Choose from library"
          loading={isSaving}
          onPress={() => onPick('library')}
          testID="change-photo-library"
        />
        <FormButton
          label="Take a photo"
          onPress={() => onPick('camera')}
          testID="change-photo-camera"
          variant="secondary"
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 18, 32, 0.5)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  body: {
    color: colors.muted,
    fontSize: fontSize.md,
    lineHeight: 24,
  },
});
