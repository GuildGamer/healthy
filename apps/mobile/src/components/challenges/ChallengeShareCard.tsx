import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { Image, StyleSheet, Text, View } from 'react-native';
import appIcon from '../../../assets/icon.png';
import heroBanner from '@/assets/hero-banner.png';
import { displayFontFamily } from '@/lib/fonts';

export type ChallengeShareCardProps = {
  title: string;
  pointsAwarded: number;
  currentStreakDays: number;
  photoUri?: string;
};

/** Portrait phone ratio — matches gym selfie preview (not a squarish 4:5 crop). */
export const SHARE_CARD_ASPECT_RATIO = 3 / 4;

export function streakShareLabel(days: number): string {
  if (days <= 0) {
    return 'Fresh start';
  }

  if (days === 1) {
    return 'Day 1 streak';
  }

  return `Day ${days} streak`;
}

/**
 * Portrait share card — gym proof when a selfie exists, a designed win poster
 * otherwise. Captured off-screen by view-shot.
 *
 * Gym layout: full-bleed photo + solid caption plate (no gradient / native deps).
 */
export function ChallengeShareCard({
  title,
  pointsAwarded,
  currentStreakDays,
  photoUri,
}: ChallengeShareCardProps) {
  const streakLabel = streakShareLabel(currentStreakDays);
  const pointsLabel = `+${pointsAwarded}`;

  if (photoUri) {
    return (
      <View style={styles.shot} testID="challenge-share-card">
        <View style={styles.photoStage}>
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="cover"
            source={{ uri: photoUri }}
            style={styles.photo}
          />
          <View style={styles.accentRule} />
          <View style={styles.photoBadge}>
            <Image
              accessibilityIgnoresInvertColors
              source={appIcon}
              style={styles.brandIcon}
            />
            <Text style={styles.brandMark}>Healthy</Text>
          </View>
        </View>

        <View style={styles.captionPlate}>
          <Text numberOfLines={2} style={styles.photoTitle}>
            {title}
          </Text>
          <Text style={styles.meta}>
            {pointsLabel} pts · {streakLabel}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.shot} testID="challenge-share-card">
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="cover"
        source={heroBanner}
        style={styles.atmosphere}
      />
      <View pointerEvents="none" style={styles.glowPrimary} />
      <View pointerEvents="none" style={styles.glowSecondary} />
      <View style={styles.accentRule} />

      <View style={styles.poster}>
        <View style={styles.brandRow}>
          <Image
            accessibilityIgnoresInvertColors
            source={appIcon}
            style={styles.brandIcon}
          />
          <Text style={styles.brandMark}>Healthy</Text>
        </View>

        <View style={styles.posterBody}>
          <Text style={styles.kicker}>Challenge complete</Text>
          <Text numberOfLines={3} style={styles.posterTitle}>
            {title}
          </Text>
          <Text style={styles.points}>{pointsLabel}</Text>
          <Text style={styles.pointsHint}>points</Text>
          <View style={styles.streakChip}>
            <Text style={styles.streakChipLabel}>{streakLabel}</Text>
          </View>
        </View>

        <Text style={styles.posterFoot}>Done on Healthy</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shot: {
    width: '100%',
    aspectRatio: SHARE_CARD_ASPECT_RATIO,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  photoStage: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  photo: {
    ...StyleSheet.absoluteFillObject,
  },
  photoBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(11, 18, 32, 0.72)',
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  captionPlate: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: 4,
  },
  atmosphere: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.42,
  },
  glowPrimary: {
    position: 'absolute',
    top: -90,
    right: -70,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.accent,
    opacity: 0.18,
  },
  glowSecondary: {
    position: 'absolute',
    bottom: 48,
    left: -70,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.accent,
    opacity: 0.1,
  },
  accentRule: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.accent,
  },
  poster: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    justifyContent: 'space-between',
  },
  posterBody: {
    gap: spacing.sm,
  },
  kicker: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  posterTitle: {
    color: colors.text,
    fontFamily: displayFontFamily,
    fontSize: 28,
    lineHeight: 34,
  },
  points: {
    color: colors.text,
    fontFamily: displayFontFamily,
    fontSize: 56,
    lineHeight: 60,
    marginTop: spacing.sm,
  },
  pointsHint: {
    color: colors.muted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  streakChip: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    backgroundColor: colors.accentContainer,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  streakChipLabel: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  posterFoot: {
    color: colors.muted,
    fontSize: fontSize.xs,
    letterSpacing: 0.4,
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
  photoTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  meta: {
    color: colors.muted,
    fontSize: fontSize.sm,
  },
});
