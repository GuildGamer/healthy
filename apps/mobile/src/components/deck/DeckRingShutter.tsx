import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { type Theme, useTheme, useThemedStyles } from '@/theme';

const RING_SIZE = 92;
const RING_RADIUS = 42;
const RING_STROKE = 5;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const CORE_INSET = 13;

interface DeckRingShutterProps {
  /** 0 to 1: the time left, drawn as the ring. */
  remaining: number;
  tone: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}

/** The shutter, with the time left drawn round it where your eyes already are. */
export function DeckRingShutter({
  remaining,
  tone,
  onPress,
  disabled = false,
  testID,
}: DeckRingShutterProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const clamped = Math.min(Math.max(remaining, 0), 1);

  return (
    <Pressable
      accessibilityLabel="Take photo"
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.ring, { opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }]}
      testID={testID}
    >
      <Svg height={RING_SIZE} style={StyleSheet.absoluteFill} viewBox="0 0 92 92" width={RING_SIZE}>
        <Circle
          cx={46}
          cy={46}
          fill="none"
          r={RING_RADIUS}
          stroke={colors.border}
          strokeWidth={RING_STROKE}
        />
        <Circle
          cx={46}
          cy={46}
          fill="none"
          origin="46, 46"
          r={RING_RADIUS}
          rotation={-90}
          stroke={tone}
          strokeDasharray={`${RING_CIRCUMFERENCE}`}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - clamped)}
          strokeLinecap="round"
          strokeWidth={RING_STROKE}
        />
      </Svg>
      <View style={styles.core} />
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    ring: {
      alignSelf: 'center',
      width: RING_SIZE,
      height: RING_SIZE,
      marginTop: 18,
    },
    core: {
      position: 'absolute',
      top: CORE_INSET,
      left: CORE_INSET,
      right: CORE_INSET,
      bottom: CORE_INSET,
      borderRadius: RING_SIZE,
      backgroundColor: theme.colors.text,
    },
  });
