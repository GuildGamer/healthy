import { fontWeight, radii } from '@product/brand';
import { Pressable, StyleSheet, Text } from 'react-native';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { DECK_READING_SIZE } from './constants';

interface DeckReadingSlotProps {
  value: string;
  /** Shown faintly while the slot is empty. */
  placeholder: string;
  isActive: boolean;
  hasError?: boolean;
  /** The sheet's tone, used for the ring around the slot being typed. */
  tone: string;
  accessibilityLabel: string;
  onPress?: () => void;
  testID?: string;
}

/** One number of a reading, big, with a ring while you type into it. */
export function DeckReadingSlot({
  value,
  placeholder,
  isActive,
  hasError = false,
  tone,
  accessibilityLabel,
  onPress,
  testID,
}: DeckReadingSlotProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const ringColor = hasError ? colors.danger : tone;
  const isEmpty = value.length === 0;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityValue={{ text: value || 'empty' }}
      disabled={!onPress}
      onPress={onPress}
      style={[
        styles.slot,
        isActive || hasError
          ? { borderColor: ringColor, backgroundColor: colors.surfaceRaised }
          : null,
      ]}
      testID={testID}
    >
      <Text
        style={[
          styles.digits,
          isEmpty ? styles.ghost : null,
          hasError ? { color: colors.danger } : null,
        ]}
      >
        {isEmpty ? placeholder : value}
      </Text>
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    slot: {
      minWidth: 100,
      paddingHorizontal: 12,
      paddingTop: 6,
      paddingBottom: 10,
      borderRadius: radii.xl,
      borderWidth: 2,
      borderColor: 'transparent',
      alignItems: 'center',
    },
    digits: {
      color: theme.colors.text,
      fontSize: DECK_READING_SIZE,
      fontWeight: fontWeight.semibold,
      letterSpacing: -3,
      lineHeight: DECK_READING_SIZE + 4,
      fontVariant: ['tabular-nums'],
    },
    ghost: {
      color: theme.colors.border,
    },
  });
