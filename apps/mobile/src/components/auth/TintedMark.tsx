import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { radii } from '@product/brand';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ChallengeIconName } from '@/components/challenges/challenge-icon';

export type TintedMarkSize = 'md' | 'lg';

const markMetrics: Record<TintedMarkSize, { box: number; glyph: number }> = {
  md: { box: 48, glyph: 22 },
  lg: { box: 72, glyph: 34 },
};

interface TintedMarkProps {
  /** Glyph colour — the `iconColor` half of a `categoryIconTint` entry. */
  iconColor: string;
  icon: ChallengeIconName;
  size?: TintedMarkSize;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** Tile fill — the `tint` half of a `categoryIconTint` entry. */
  tint: string;
}

/**
 * The tinted rounded tile the unauthenticated surfaces are built from: the
 * onboarding slide art and the splash constellation both compose these rather
 * than floating a lone glyph in empty space.
 */
export function TintedMark({
  iconColor,
  icon,
  size = 'md',
  style,
  testID,
  tint,
}: TintedMarkProps) {
  const { box, glyph } = markMetrics[size];

  return (
    <View
      style={[styles.mark, { backgroundColor: tint, height: box, width: box }, style]}
      testID={testID}
    >
      <MaterialCommunityIcons color={iconColor} name={icon} size={glyph} />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
  },
});
