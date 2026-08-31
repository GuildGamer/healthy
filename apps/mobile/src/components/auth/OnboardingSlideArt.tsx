import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, fontSize, fontWeight, radii } from '@product/brand';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { categoryIconTint } from '@/components/challenges/challenge-icon';
import type { OnboardingArt } from './constants/onboarding-slides';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/**
 * Composed onboarding visuals — category-tinted marks from the challenge
 * language, not a lone Feather glyph floating in empty space.
 */
export function OnboardingSlideArt({ art }: { art: OnboardingArt }) {
  if (art === 'habits') {
    return (
      <View style={styles.stage}>
        <View style={[styles.glow, { backgroundColor: colors.accentContainer }]} />
        <Mark
          color={categoryIconTint.hypertension.iconColor}
          icon="heart-pulse"
          style={[styles.float, styles.habitsTopLeft]}
          tint={categoryIconTint.hypertension.tint}
        />
        <Mark
          color={categoryIconTint.diabetes.iconColor}
          icon="water-check"
          style={[styles.float, styles.habitsTopRight]}
          tint={categoryIconTint.diabetes.tint}
        />
        <Mark
          color={categoryIconTint.asthma.iconColor}
          icon="lungs"
          style={[styles.float, styles.habitsBottomLeft]}
          tint={categoryIconTint.asthma.tint}
        />
        <Mark
          color={categoryIconTint.general.iconColor}
          icon="leaf"
          size="lg"
          style={[styles.float, styles.habitsCenter]}
          tint={categoryIconTint.general.tint}
        />
      </View>
    );
  }

  if (art === 'points') {
    return (
      <View style={styles.stage}>
        <View style={[styles.glow, { backgroundColor: '#1A2E24' }]} />
        <View style={[styles.chip, styles.chipLeft]}>
          <Text style={styles.chipText}>+15</Text>
        </View>
        <View style={[styles.chip, styles.chipRight]}>
          <Text style={styles.chipText}>+25</Text>
        </View>
        <View style={[styles.chip, styles.chipBottom]}>
          <Text style={styles.chipText}>streak</Text>
        </View>
        <Mark
          color={colors.accent}
          icon="star-four-points"
          size="lg"
          style={styles.pointsCore}
          tint={colors.accentContainer}
        />
      </View>
    );
  }

  return (
    <View style={styles.stage}>
      <View style={[styles.glow, { backgroundColor: '#1A2438' }]} />
      <View style={styles.shieldRing}>
        <Mark
          color={colors.accent}
          icon="shield-check"
          size="lg"
          tint={colors.accentContainer}
        />
      </View>
      <Mark
        color={categoryIconTint.hypertension.iconColor}
        icon="heart-pulse"
        style={[styles.float, styles.aheadOrbitTop]}
        tint={categoryIconTint.hypertension.tint}
      />
      <Mark
        color={categoryIconTint.diabetes.iconColor}
        icon="water-check"
        style={[styles.float, styles.aheadOrbitRight]}
        tint={categoryIconTint.diabetes.tint}
      />
      <Mark
        color={categoryIconTint.asthma.iconColor}
        icon="lungs"
        style={[styles.float, styles.aheadOrbitLeft]}
        tint={categoryIconTint.asthma.tint}
      />
    </View>
  );
}

function Mark({
  color,
  icon,
  size = 'md',
  style,
  tint,
}: {
  color: string;
  icon: IconName;
  size?: 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  tint: string;
}) {
  const box = size === 'lg' ? 72 : 48;
  const glyph = size === 'lg' ? 34 : 22;

  return (
    <View
      style={[
        styles.mark,
        { backgroundColor: tint, height: box, width: box },
        style,
      ]}
    >
      <MaterialCommunityIcons color={color} name={icon} size={glyph} />
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
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
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
