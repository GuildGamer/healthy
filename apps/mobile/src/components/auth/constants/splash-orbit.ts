import { colors } from '@product/brand';
import {
  categoryIconTint,
  type ChallengeIconName,
} from '@/components/challenges/challenge-icon';

/** Distance from the app icon out to each orbiting mark, in points. */
export const SPLASH_ORBIT_RADIUS = 126;

export interface SplashOrbitMark {
  id: string;
  icon: ChallengeIconName;
  iconColor: string;
  tint: string;
  /** Resting offset from the stage centre, in points. */
  offsetX: number;
  offsetY: number;
  /** Resting tilt, so the ring reads hand-placed rather than machined. */
  tilt: number;
}

/** Converts a bearing in degrees clockwise from the top of the ring. */
function orbitOffset(bearing: number): { offsetX: number; offsetY: number } {
  const radians = (bearing * Math.PI) / 180;

  return {
    offsetX: Math.round(Math.sin(radians) * SPLASH_ORBIT_RADIUS),
    offsetY: Math.round(-Math.cos(radians) * SPLASH_ORBIT_RADIUS),
  };
}

/**
 * The category palette the onboarding carousel opens with, plus the streak and
 * trophy marks the product pays out in, so launch and first run read as one
 * moment. Bearings alternate warm and cool so no two neighbours share a hue.
 */
export const splashOrbitMarks: readonly SplashOrbitMark[] = [
  {
    id: 'hypertension',
    icon: 'heart-pulse',
    ...categoryIconTint.hypertension,
    ...orbitOffset(8),
    tilt: -7,
  },
  {
    id: 'streak',
    icon: 'fire',
    iconColor: colors.streakCore,
    tint: colors.surfaceRaised,
    ...orbitOffset(64),
    tilt: 9,
  },
  {
    id: 'diabetes',
    icon: 'water-check',
    ...categoryIconTint.diabetes,
    ...orbitOffset(124),
    tilt: 5,
  },
  {
    id: 'trophy',
    icon: 'trophy',
    iconColor: colors.warning,
    tint: colors.surfaceRaised,
    ...orbitOffset(186),
    tilt: -6,
  },
  {
    id: 'asthma',
    icon: 'lungs',
    ...categoryIconTint.asthma,
    ...orbitOffset(244),
    tilt: 7,
  },
  {
    id: 'points',
    icon: 'star-four-points',
    iconColor: colors.accent,
    tint: colors.accentContainer,
    ...orbitOffset(302),
    tilt: -9,
  },
];
