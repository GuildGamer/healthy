import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import type { TodayWin } from './challenge-list-layout';

type TodayWinHeaderProps = {
  win: TodayWin;
  testID?: string;
};

/** Shared “today’s win” progress — Home hero + Challenges list. */
export function TodayWinHeader({ win, testID }: TodayWinHeaderProps) {
  if (win.target === 0) {
    return null;
  }

  const ratio = win.target === 0 ? 0 : win.filled / win.target;

  return (
    <View style={styles.wrap} testID={testID}>
      <Text style={styles.label}>{win.label}</Text>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: win.target,
          now: win.filled,
        }}
        style={styles.track}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${Math.round(ratio * 100)}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  label: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  track: {
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.full,
    backgroundColor: colors.accent,
  },
});
