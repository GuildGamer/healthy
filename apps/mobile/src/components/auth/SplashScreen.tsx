import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { Glyph } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import appIcon from '../../../assets/icon.png';
import {
  SPLASH_CARD_HEIGHT,
  SPLASH_CARD_WIDTH,
  SPLASH_SWAY_DEG,
  type SplashFanCard,
} from './constants/splash-intro';
import { deckCardTone } from './deck-card-tone';
import { useSplashIntro } from './use-splash-intro';

const ICON_SIZE = 104;
const FAN_RAIL_HEIGHT = 4;

interface SplashScreenProps {
  /** True once the native splash has been told to hide; the intro clock starts here. */
  hasNativeSplashHidden: boolean;
  /** True once the screen underneath can take over: the overlay leaves at once. */
  isReady: boolean;
  /** After the exit fade, so the overlay can be unmounted. */
  onExited: () => void;
}

/**
 * One overlay above the whole app for launch. The icon sits at dead centre,
 * where the native splash leaves it, and Today's three cards are dealt out
 * from behind it like a hand while launch work runs.
 */
export function SplashScreen({ hasNativeSplashHidden, isReady, onExited }: SplashScreenProps) {
  const styles = useThemedStyles(createStyles);
  const { motion, isExiting } = useSplashIntro({ hasNativeSplashHidden, isReady, onExited });
  const swayRotate = motion.sway.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `-${SPLASH_SWAY_DEG}deg`],
  });

  return (
    <Animated.View
      pointerEvents={isExiting ? 'none' : 'auto'}
      style={[styles.overlay, { opacity: motion.layerOpacity }]}
      testID="splash-screen"
    >
      <View style={styles.stage}>
        <Animated.View
          style={[
            styles.fan,
            { opacity: motion.cardsOpacity, transform: [{ rotate: swayRotate }] },
          ]}
        >
          {motion.fan.map(({ card, progress }) => (
            <FanCard card={card} key={card.kind} progress={progress} />
          ))}
        </Animated.View>
        <Image
          accessibilityLabel="Healthy"
          source={appIcon}
          style={styles.icon}
          testID="splash-icon"
        />
      </View>
      <View style={styles.caption}>
        <Text allowFontScaling={false} style={styles.wordmark}>
          Healthy
        </Text>
      </View>
    </Animated.View>
  );
}

function FanCard({ card, progress }: { card: SplashFanCard; progress: Animated.Value }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { deckCards } = theme;

  const transform = [
    { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, card.translateX] }) },
    { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, card.translateY] }) },
    {
      rotate: progress.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', `${card.rotateDeg}deg`],
      }),
    },
  ];
  const opacity = progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 1] });

  return (
    <Animated.View
      style={[styles.fanCard, { backgroundColor: deckCards[card.kind], opacity, transform }]}
      testID={`splash-fan-${card.kind}`}
    >
      {deckCards.hasToneRail ? (
        <View style={[styles.fanRail, { backgroundColor: deckCardTone(theme, card.kind) }]} />
      ) : null}
      <Glyph color={deckCards.subtext} name={card.glyph} size={14} />
    </Animated.View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
    },
    stage: {
      width: ICON_SIZE,
      height: ICON_SIZE,
    },
    fan: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    /** Starts tucked wholly behind the icon and pivots from its bottom edge. */
    fanCard: {
      position: 'absolute',
      width: SPLASH_CARD_WIDTH,
      height: SPLASH_CARD_HEIGHT,
      borderRadius: radii.md,
      padding: spacing.sm,
      overflow: 'hidden',
      transformOrigin: 'bottom',
      borderWidth: theme.deckCards.hasToneRail ? StyleSheet.hairlineWidth : 0,
      borderColor: theme.colors.border,
    },
    fanRail: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: FAN_RAIL_HEIGHT,
    },
    icon: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      borderRadius: radii.xl,
    },
    /** Hung off the midpoint so the icon itself never moves. */
    caption: {
      position: 'absolute',
      top: '50%',
      left: 0,
      right: 0,
      marginTop: ICON_SIZE / 2 + spacing.md,
      alignItems: 'center',
    },
    wordmark: {
      color: theme.colors.text,
      fontSize: fontSize.xl,
      fontWeight: fontWeight.semibold,
      letterSpacing: -0.4,
    },
  });
