import { colors, fontSize, fontWeight, spacing } from '@product/brand';
import { Image, StyleSheet, Text, View } from 'react-native';
import appIcon from '../../../assets/icon.png';
import { displayFontFamily } from '@/lib/fonts';

export type ChallengeShareCardProps = {
  photoUri: string;
  title: string;
  pointsAwarded: number;
  currentStreakDays: number;
};

/**
 * Full-bleed gym proof with a Strava-style brand strip — captured for Share.
 */
export function ChallengeShareCard({
  photoUri,
  title,
  pointsAwarded,
  currentStreakDays,
}: ChallengeShareCardProps) {
  const streakLabel =
    currentStreakDays === 1
      ? 'Day 1 streak'
      : `Day ${currentStreakDays} streak`;

  return (
    <View style={styles.shot} testID="challenge-share-card">
      <Image
        accessibilityIgnoresInvertColors
        source={{ uri: photoUri }}
        style={styles.photo}
      />

      <View pointerEvents="none" style={styles.fadeTop} />
      <View pointerEvents="none" style={styles.fadeMid} />
      <View pointerEvents="none" style={styles.fadeBottom} />

      <View style={styles.footer}>
        <View style={styles.brandRow}>
          <Image
            accessibilityIgnoresInvertColors
            source={appIcon}
            style={styles.brandIcon}
          />
          <Text style={styles.brandMark}>Healthy</Text>
        </View>
        <Text numberOfLines={2} style={styles.title}>
          {title}
        </Text>
        <Text style={styles.meta}>
          +{pointsAwarded} pts · {streakLabel}
        </Text>
      </View>

      <Image
        accessibilityIgnoresInvertColors
        source={appIcon}
        style={styles.watermark}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shot: {
    width: '100%',
    aspectRatio: 3 / 4,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  photo: {
    ...StyleSheet.absoluteFillObject,
  },
  fadeTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '42%',
    height: '18%',
    backgroundColor: 'rgba(11, 18, 32, 0.15)',
  },
  fadeMid: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '22%',
    height: '22%',
    backgroundColor: 'rgba(11, 18, 32, 0.45)',
  },
  fadeBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '28%',
    backgroundColor: 'rgba(11, 18, 32, 0.88)',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    gap: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  brandIcon: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
  brandMark: {
    color: colors.accent,
    fontFamily: displayFontFamily,
    fontSize: fontSize.sm,
    letterSpacing: 0.4,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  meta: {
    color: colors.muted,
    fontSize: fontSize.sm,
  },
  watermark: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 28,
    height: 28,
    borderRadius: 6,
    opacity: 0.28,
  },
});
