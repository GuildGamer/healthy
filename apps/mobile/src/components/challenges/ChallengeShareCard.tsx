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
  photoWidth?: number;
  photoHeight?: number;
  capturedAt?: Date;
  completedCount?: number;
  targetCount?: number;
  kicker?: string;
};

export function formatShareReps(
  completedCount: number,
  targetCount?: number,
): string {
  if (targetCount != null && targetCount > 0) {
    return `${completedCount}/${targetCount}`;
  }

  return String(completedCount);
}

/** Instagram-portrait card. Gym proof and walk posters share this canvas. */
export const SHARE_CARD_ASPECT_RATIO = 3 / 4;

const PHOTO_FADE_STOPS = 24;

export function streakShareLabel(days: number): string {
  if (days <= 0) {
    return 'Fresh start';
  }

  if (days === 1) {
    return 'Day 1 streak';
  }

  return `Day ${days} streak`;
}

export function formatShareDate(at: Date = new Date()): string {
  return at.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

/** Date and time, the way a Strava activity stamp reads on a photo. */
export function formatShareStamp(at: Date = new Date()): string {
  const datePart = at.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const timePart = at.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return `${datePart} · ${timePart}`;
}

/**
 * Designed win card. A gym selfie is the post. The mark and streak say
 * which app, not which challenge. Captured off-screen by view-shot.
 */
export function ChallengeShareCard({
  title,
  pointsAwarded,
  currentStreakDays,
  photoUri,
  capturedAt,
  completedCount,
  targetCount,
  kicker,
}: ChallengeShareCardProps) {
  if (photoUri) {
    return (
      <PhotoShareCard
        capturedAt={capturedAt}
        currentStreakDays={currentStreakDays}
        photoUri={photoUri}
      />
    );
  }

  return (
    <PosterShareCard
      completedCount={completedCount}
      currentStreakDays={currentStreakDays}
      kicker={kicker}
      pointsAwarded={pointsAwarded}
      targetCount={targetCount}
      title={title}
    />
  );
}

function PhotoShareCard({
  currentStreakDays,
  photoUri,
  capturedAt = new Date(),
}: {
  currentStreakDays: number;
  photoUri: string;
  capturedAt?: Date;
}) {
  const stamp = formatShareStamp(capturedAt);
  const hasStreak = currentStreakDays > 0;

  return (
    <View style={styles.shot} testID="challenge-share-card">
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="cover"
        source={{ uri: photoUri }}
        style={styles.photoFill}
      />
      <PhotoFade />

      <View style={styles.logoLockup}>
        <Image
          accessibilityIgnoresInvertColors
          source={appIcon}
          style={styles.logoIcon}
        />
        <Text style={[styles.overlayText, styles.logoWord]}>Healthy</Text>
      </View>

      <View style={styles.photoStats}>
        {hasStreak ? (
          <>
            <Text style={[styles.overlayText, styles.streakValue]}>
              {currentStreakDays}
            </Text>
            <Text style={[styles.overlayText, styles.streakUnit]}>
              day streak
            </Text>
          </>
        ) : (
          <Text style={[styles.overlayText, styles.streakUnit]}>
            Fresh start
          </Text>
        )}
        <Text style={[styles.overlayText, styles.photoStamp]}>{stamp}</Text>
      </View>
    </View>
  );
}

function PosterShareCard({
  title,
  pointsAwarded,
  currentStreakDays,
  completedCount,
  targetCount,
  kicker = 'Challenge complete',
}: {
  title: string;
  pointsAwarded: number;
  currentStreakDays: number;
  completedCount?: number;
  targetCount?: number;
  kicker?: string;
}) {
  const streakLabel = streakShareLabel(currentStreakDays);
  const dateLabel = formatShareDate();
  const hasReps = completedCount != null && completedCount > 0;
  const hero = hasReps
    ? formatShareReps(completedCount, targetCount)
    : `+${pointsAwarded}`;
  const heroHint = hasReps ? 'push-ups' : 'points';
  const showPoints = hasReps && pointsAwarded > 0;

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
          <Text style={styles.kicker}>{kicker}</Text>
          <Text numberOfLines={2} style={styles.posterTitle}>
            {title}
          </Text>
          <Text style={styles.points}>{hero}</Text>
          <Text style={styles.pointsHint}>{heroHint}</Text>
          {showPoints ? (
            <Text style={styles.pointsHint}>+{pointsAwarded} points</Text>
          ) : null}
          <View style={styles.streakChip}>
            <Text style={styles.streakChipLabel}>{streakLabel}</Text>
          </View>
        </View>

        <Text style={styles.posterFoot}>{dateLabel} · Done on Healthy</Text>
      </View>
    </View>
  );
}

function PhotoFade() {
  return (
    <View pointerEvents="none" style={styles.photoFade}>
      {Array.from({ length: PHOTO_FADE_STOPS }, (_, index) => {
        const t = index / (PHOTO_FADE_STOPS - 1);
        return (
          <View
            key={index}
            style={[styles.photoFadeStop, { opacity: t * t * 0.72 }]}
          />
        );
      })}
    </View>
  );
}

const overlayShadow = {
  textShadowColor: 'rgba(11, 18, 32, 0.7)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 8,
} as const;

const styles = StyleSheet.create({
  shot: {
    width: '100%',
    aspectRatio: SHARE_CARD_ASPECT_RATIO,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  photoFill: {
    ...StyleSheet.absoluteFillObject,
  },
  photoFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '28%',
    justifyContent: 'flex-end',
  },
  photoFadeStop: {
    flex: 1,
    backgroundColor: colors.background,
  },
  logoLockup: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
  },
  logoWord: {
    color: colors.text,
    fontFamily: displayFontFamily,
    fontSize: fontSize.sm,
    letterSpacing: 0.4,
  },
  photoStats: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    gap: 2,
  },
  overlayText: {
    ...overlayShadow,
  },
  streakValue: {
    color: colors.text,
    fontFamily: displayFontFamily,
    fontSize: 40,
    lineHeight: 44,
  },
  streakUnit: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  photoStamp: {
    color: colors.text,
    fontSize: fontSize.xs,
    marginTop: 4,
    opacity: 0.88,
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
  poster: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    justifyContent: 'space-between',
    zIndex: 1,
  },
  posterBody: {
    gap: 4,
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
    fontSize: 26,
    lineHeight: 30,
  },
  points: {
    color: colors.text,
    fontFamily: displayFontFamily,
    fontSize: 52,
    lineHeight: 56,
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
    alignSelf: 'flex-start',
    gap: spacing.sm,
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
});
