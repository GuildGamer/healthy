import Feather from '@expo/vector-icons/Feather';
import { spacing } from '@product/brand';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Theme, useTheme, useThemedStyles } from '@/theme';

/** A photo is viewed on black in either scheme; the chrome uses camera tokens. */
const VIEWER_BACKDROP = 'rgba(0, 0, 0, 0.92)';

export function ProfilePhotoPreviewModal({
  imageUri,
  onClose,
  visible,
}: {
  imageUri: string;
  onClose: () => void;
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { camera } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable
        accessibilityLabel="Close photo preview"
        accessibilityRole="button"
        onPress={onClose}
        style={styles.backdrop}
        testID="profile-photo-preview-backdrop"
      >
        <View
          pointerEvents="box-none"
          style={[styles.closeRow, { paddingTop: insets.top + spacing.sm }]}
        >
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            hitSlop={12}
            onPress={onClose}
            style={styles.closeButton}
            testID="profile-photo-preview-close"
          >
            <Feather color={camera.text} name="x" size={22} />
          </Pressable>
        </View>
        <View pointerEvents="none" style={styles.imageHost}>
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={{ uri: imageUri }}
            style={styles.image}
            testID="profile-photo-preview-image"
          />
        </View>
      </Pressable>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: VIEWER_BACKDROP,
    },
    closeRow: {
      alignItems: 'flex-end',
      paddingHorizontal: spacing.md,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.camera.glass,
    },
    imageHost: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
    },
    image: {
      width: '100%',
      height: '100%',
    },
  });
