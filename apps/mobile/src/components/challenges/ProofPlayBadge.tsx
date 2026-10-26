import { StyleSheet, View } from 'react-native';
import { Glyph } from '@/components/icons';

const PLAY_BADGE_SIZE = 56;

/** The round play mark that tells people a clip poster is tappable. */
export function ProofPlayBadge() {
  return (
    <View style={styles.badge}>
      <Glyph color="#FFFFFF" name="play" size={24} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: PLAY_BADGE_SIZE,
    height: PLAY_BADGE_SIZE,
    borderRadius: PLAY_BADGE_SIZE / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
