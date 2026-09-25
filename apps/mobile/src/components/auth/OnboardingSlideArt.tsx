import { colors, fontSize, fontWeight, radii } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { categoryIconTint } from '@/components/challenges/challenge-icon';
import type { OnboardingArt } from './constants/onboarding-slides';
import { TintedMark } from './TintedMark';

/** Deep green wash behind the points art — no brand token sits at this value. */
const POINTS_GLOW = '#1A2E24';

/**
 * Composed onboarding visuals — category-tinted marks from the challenge
 * language, not a lone Feather glyph floating in empty space.
 */
export function OnboardingSlideArt({ art }: { art: OnboardingArt }) {
  if (art === 'habits') {
    return (
      <View style={styles.stage}>
        <View style={[styles.glow, { backgroundColor: colors.accentContainer }]} />
        <TintedMark
          icon="heart-pulse"
          style={[styles.float, styles.habitsTopLeft]}
          {...categoryIconTint.hypertension}
        />
        <TintedMark
          icon="water-check"
          style={[styles.float, styles.habitsTopRight]}
          {...categoryIconTint.diabetes}
        />
        <TintedMark
          icon="lungs"
          style={[styles.float, styles.habitsBottomLeft]}
          {...categoryIconTint.asthma}
        />
        <TintedMark
          icon="leaf"
          size="lg"
          style={[styles.float, styles.habitsCenter]}
          {...categoryIconTint.general}
        />
      </View>
    );
  }

  if (art === 'points') {
    return (
      <View style={styles.stage}>
        <View style={[styles.glow, { backgroundColor: POINTS_GLOW }]} />
        <View style={[styles.chip, styles.chipLeft]}>
          <Text style={styles.chipText}>+15</Text>
        </View>
        <View style={[styles.chip, styles.chipRight]}>
          <Text style={styles.chipText}>+25</Text>
        </View>
        <View style={[styles.chip, styles.chipBottom]}>
          <Text style={styles.chipText}>streak</Text>
        </View>
        <TintedMark
          icon="star-four-points"
          iconColor={colors.accent}
          size="lg"
          style={styles.pointsCore}
          tint={colors.accentContainer}
        />
      </View>
    );
  }

  return (
    <View style={styles.stage}>
      <View style={[styles.glow, { backgroundColor: colors.surfaceRaised }]} />
      <View style={styles.shieldRing}>
        <TintedMark
          icon="shield-check"
          iconColor={colors.accent}
          size="lg"
          tint={colors.accentContainer}
        />
      </View>
      <TintedMark
        icon="heart-pulse"
        style={[styles.float, styles.aheadOrbitTop]}
        {...categoryIconTint.hypertension}
      />
      <TintedMark
        icon="water-check"
        style={[styles.float, styles.aheadOrbitRight]}
        {...categoryIconTint.diabetes}
      />
      <TintedMark
        icon="lungs"
        style={[styles.float, styles.aheadOrbitLeft]}
        {...categoryIconTint.asthma}
      />
    </View>
  );
}

const STAGE = 220;

const styles = StyleSheet.create({
  stage: {
    width: STAGE,
    height: STAGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: STAGE * 0.72,
    height: STAGE * 0.72,
    borderRadius: radii.full,
    opacity: 0.9,
  },
  float: {
    position: 'absolute',
  },
  habitsTopLeft: {
    top: 18,
    left: 22,
    transform: [{ rotate: '-8deg' }],
  },
  habitsTopRight: {
    top: 28,
    right: 18,
    transform: [{ rotate: '10deg' }],
  },
  habitsBottomLeft: {
    bottom: 24,
    left: 36,
    transform: [{ rotate: '6deg' }],
  },
  habitsCenter: {
    bottom: 28,
    right: 28,
  },
  pointsCore: {
    zIndex: 2,
  },
  chip: {
    position: 'absolute',
    zIndex: 3,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipLeft: {
    left: 8,
    top: 56,
  },
  chipRight: {
    right: 4,
    top: 40,
  },
  chipBottom: {
    bottom: 36,
    left: 76,
  },
  chipText: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  shieldRing: {
    width: 96,
    height: 96,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: `${colors.accent}55`,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  aheadOrbitTop: {
    top: 8,
    right: 48,
    transform: [{ rotate: '8deg' }],
  },
  aheadOrbitRight: {
    right: 12,
    bottom: 48,
  },
  aheadOrbitLeft: {
    left: 10,
    bottom: 40,
    transform: [{ rotate: '-6deg' }],
  },
});
