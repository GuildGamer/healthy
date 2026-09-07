import { colors, radii } from '@product/brand';
import { Image, StyleSheet, View } from 'react-native';

/** Compact preview window. Avoids a full-height selfie strip. */
export const EVIDENCE_PREVIEW_ASPECT_RATIO = 4 / 5;

type EvidencePhotoFrameProps = {
  uri: string;
  width?: number;
  height?: number;
  testID?: string;
};

/**
 * Shows the captured photo in a 4:5 window. `cover` fills the frame so a
 * phone selfie does not read as a slim strip. Actions stay on screen.
 */
export function EvidencePhotoFrame({
  uri,
  testID,
}: EvidencePhotoFrameProps) {
  return (
    <View style={styles.mat}>
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="cover"
        source={{ uri }}
        style={styles.photo}
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mat: {
    width: '100%',
    aspectRatio: EVIDENCE_PREVIEW_ASPECT_RATIO,
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
});
