import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const DEFAULT_LENGTH = 6;

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  testID?: string;
};

function digitsOnly(value: string, length: number): string {
  return value.replace(/\D/g, '').slice(0, length);
}

export function OtpInput({
  value,
  onChange,
  length = DEFAULT_LENGTH,
  testID,
}: OtpInputProps) {
  const inputRef = useRef<TextInput>(null);
  const digits = digitsOnly(value, length);

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      style={styles.row}
    >
      {Array.from({ length }, (_, index) => {
        const isActive = digits.length === index || (digits.length === length && index === length - 1);

        return (
          <View
            key={index}
            style={[styles.cell, isActive ? styles.cellActive : null]}
          >
            <Text style={styles.digit}>{digits[index] ?? ''}</Text>
          </View>
        );
      })}

      <TextInput
        autoComplete="one-time-code"
        caretHidden
        keyboardType="number-pad"
        maxLength={length}
        onChangeText={(next) => onChange(digitsOnly(next, length))}
        ref={inputRef}
        style={styles.hiddenInput}
        testID={testID}
        textContentType="oneTimeCode"
        value={digits}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cell: {
    flex: 1,
    minHeight: 52,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSurface,
  },
  digit: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  hiddenInput: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
  },
});
