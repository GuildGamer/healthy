import { colors, radii, spacing } from '@product/brand';
import { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import appIcon from '../../../assets/icon.png';
import { displayFontFamily } from '@/lib/fonts';

const ICON_SIZE = 112;
const WORDMARK_SIZE = 32;
const INTRO_MS = 700;

interface SplashScreenProps {
  /** Launch only. Session loading gates stay still so the mark does not replay. */
  animate?: boolean;
}

export function SplashScreen({ animate = false }: SplashScreenProps) {
  const intro = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) {
      return;
    }

    intro.value = withTiming(1, {
      duration: INTRO_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [animate, intro]);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: [{ scale: interpolate(intro.value, [0, 1], [0.78, 1]) }],
  }));

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(intro.value, [0.4, 1], [0, 1]),
  }));

  return (
    <Animated.View style={styles.container} testID="splash-screen">
      <Animated.View style={iconStyle}>
        <Image
          accessibilityLabel="Healthy"
          source={appIcon}
          style={styles.icon}
          testID="splash-icon"
        />
      </Animated.View>
      <Animated.Text
        allowFontScaling={false}
        style={[styles.wordmark, wordmarkStyle]}
      >
        Healthy
      </Animated.Text>
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
    gap: spacing.md,
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: radii.xl,
  },
  wordmark: {
    alignSelf: 'stretch',
    color: colors.text,
    fontFamily: displayFontFamily,
    fontSize: WORDMARK_SIZE,
    textAlign: 'center',
  },
});
