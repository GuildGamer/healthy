import { colors, radii, spacing } from '@product/brand';
import { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { displayFontFamily } from '@/lib/fonts';
import appIcon from '../../../assets/icon.png';
import {
  SPLASH_ORBIT_RADIUS,
  splashOrbitMarks,
  type SplashOrbitMark,
} from './constants/splash-orbit';
import { TintedMark } from './TintedMark';

const STAGE_SIZE = 320;
const DISC_SIZE = 190;
const ICON_SIZE = 104;
const WORDMARK_SIZE = 32;
const UNDERLINE_WIDTH = 72;

const DISC_MS = 620;
const MARK_DELAY_MS = 300;
const MARK_STAGGER_MS = 90;
const MARK_MS = 620;
const WORDMARK_DELAY_MS = 760;
const WORDMARK_MS = 520;
/** Starts once the constellation has settled, so nothing drifts mid-flight. */
const AMBIENT_DELAY_MS = 1100;
const AMBIENT_MS = 2600;

interface SplashScreenProps {
  /** Launch only. Session loading gates stay still so the mark does not replay. */
  animate?: boolean;
}

/**
 * Launch screen built from the onboarding carousel's visual language: the app
 * icon on a tinted disc, ringed by the same category marks the first-run slides
 * open with. On launch the marks fly out of the icon and settle onto the ring.
 *
 * The icon itself never animates. It is the one thing the native splash already
 * has on screen, at this size and this position, so holding it still turns the
 * handoff into a continuation rather than a cut.
 */
export function SplashScreen({ animate = false }: SplashScreenProps) {
  const disc = useSharedValue(animate ? 0 : 1);
  const wordmark = useSharedValue(animate ? 0 : 1);
  const ambient = useSharedValue(0);

  useEffect(() => {
    if (!animate) {
      return;
    }

    disc.value = withTiming(1, {
      duration: DISC_MS,
      easing: Easing.out(Easing.cubic),
    });

    wordmark.value = withDelay(
      WORDMARK_DELAY_MS,
      withTiming(1, { duration: WORDMARK_MS, easing: Easing.out(Easing.cubic) }),
    );

    ambient.value = withDelay(
      AMBIENT_DELAY_MS,
      withRepeat(
        withTiming(1, { duration: AMBIENT_MS, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      ),
    );
  }, [ambient, animate, disc, wordmark]);

  const discStyle = useAnimatedStyle(() => ({
    opacity: disc.value,
    transform: [
      { scale: interpolate(disc.value, [0, 1], [0.72, 1]) },
      { scale: interpolate(ambient.value, [0, 1], [1, 1.06]) },
    ],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(disc.value, [0.3, 1], [0, 1]),
    transform: [{ scale: interpolate(disc.value, [0, 1], [0.8, 1]) }],
  }));

  // A slow turn of the whole constellation, so the settled ring keeps breathing.
  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(ambient.value, [0, 1], [0, -5])}deg` }],
  }));

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmark.value,
    transform: [{ translateY: interpolate(wordmark.value, [0, 1], [14, 0]) }],
  }));

  const underlineStyle = useAnimatedStyle(() => ({
    opacity: wordmark.value,
    transform: [{ scaleX: wordmark.value }],
  }));

  return (
    <Animated.View style={styles.container} testID="splash-screen">
      <Animated.View style={styles.stage}>
        <Animated.View pointerEvents="none" style={[styles.layer, discStyle]}>
          <Animated.View style={styles.disc} />
        </Animated.View>

        <Animated.View pointerEvents="none" style={[styles.layer, ringStyle]}>
          <Animated.View style={styles.ring} />
        </Animated.View>

        <Animated.View pointerEvents="none" style={[styles.layer, orbitStyle]}>
          {splashOrbitMarks.map((mark, index) => (
            <SplashOrbitTile
              key={mark.id}
              animate={animate}
              index={index}
              mark={mark}
            />
          ))}
        </Animated.View>

        <Image
          accessibilityLabel="Healthy"
          source={appIcon}
          style={styles.icon}
          testID="splash-icon"
        />
      </Animated.View>

      <Animated.View style={styles.caption}>
        <Animated.Text
          allowFontScaling={false}
          style={[styles.wordmark, wordmarkStyle]}
        >
          Healthy
        </Animated.Text>
        <Animated.View style={[styles.underline, underlineStyle]} />
      </Animated.View>
    </Animated.View>
  );
}

/** One orbiting mark, flying out of the app icon and settling onto the ring. */
function SplashOrbitTile({
  animate,
  index,
  mark,
}: {
  animate: boolean;
  index: number;
  mark: SplashOrbitMark;
}) {
  const settle = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) {
      return;
    }

    settle.value = withDelay(
      MARK_DELAY_MS + index * MARK_STAGGER_MS,
      withTiming(1, { duration: MARK_MS, easing: Easing.out(Easing.back(1.2)) }),
    );
  }, [animate, index, settle]);

  const tileStyle = useAnimatedStyle(() => ({
    opacity: interpolate(settle.value, [0, 0.35, 1], [0, 1, 1]),
    transform: [
      { translateX: interpolate(settle.value, [0, 1], [0, mark.offsetX]) },
      { translateY: interpolate(settle.value, [0, 1], [0, mark.offsetY]) },
      { rotate: `${interpolate(settle.value, [0, 1], [0, mark.tilt])}deg` },
      { scale: interpolate(settle.value, [0, 1], [0.4, 1]) },
    ],
  }));

  return (
    <Animated.View style={[styles.layer, tileStyle]}>
      <TintedMark
        icon={mark.icon}
        iconColor={mark.iconColor}
        testID={`splash-orbit-${mark.id}`}
        tint={mark.tint}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  stage: {
    width: STAGE_SIZE,
    height: STAGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    width: DISC_SIZE,
    height: DISC_SIZE,
    borderRadius: radii.full,
    backgroundColor: colors.accentContainer,
  },
  ring: {
    width: SPLASH_ORBIT_RADIUS * 2,
    height: SPLASH_ORBIT_RADIUS * 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: `${colors.accent}3D`,
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: radii.xl,
  },
  /**
   * Hung off the vertical midpoint rather than stacked under the stage, so the
   * icon stays at dead centre — exactly where the native splash leaves it.
   */
  caption: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    marginTop: STAGE_SIZE / 2 + spacing.md,
    alignItems: 'center',
  },
  wordmark: {
    alignSelf: 'stretch',
    color: colors.text,
    fontFamily: displayFontFamily,
    fontSize: WORDMARK_SIZE,
    textAlign: 'center',
  },
  underline: {
    width: UNDERLINE_WIDTH,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colors.accent,
    marginTop: spacing.sm,
  },
});
