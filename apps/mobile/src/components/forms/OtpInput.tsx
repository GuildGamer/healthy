import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { Platform, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

const DEFAULT_LENGTH = 6;

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  testID?: string;
};

/**
 * iOS `number-pad` does not present Paste. The native converter accepts
 * `ascii-capable-number-pad` (a digit pad that still shows the paste menu);
 * React Native 0.81's public keyboard union omits that value.
 */
function otpKeyboardType(): NonNullable<TextInputProps['keyboardType']> {
  if (Platform.OS !== 'ios') {
    return 'number-pad';
  }

  return 'ascii-capable-number-pad' as unknown as NonNullable<TextInputProps['keyboardType']>;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function insertedText(previous: string, next: string): string {
  let prefixLength = 0;
  const prefixLimit = Math.min(previous.length, next.length);
  while (prefixLength < prefixLimit && previous[prefixLength] === next[prefixLength]) {
    prefixLength += 1;
  }

  let suffixLength = 0;
  const suffixLimit = Math.min(previous.length, next.length) - prefixLength;
  while (
    suffixLength < suffixLimit &&
    previous[previous.length - 1 - suffixLength] === next[next.length - 1 - suffixLength]
  ) {
    suffixLength += 1;
  }

  return next.slice(prefixLength, next.length - suffixLength);
}

function nextOtpValue(current: string, rawValue: string, length: number): string {
  const incomingDigits = digitsOnly(insertedText(current, rawValue));
  if (incomingDigits.length >= length) {
    return incomingDigits.slice(0, length);
  }

  return digitsOnly(rawValue).slice(0, length);
}

export function OtpInput({ value, onChange, length = DEFAULT_LENGTH, testID }: OtpInputProps) {
  const digits = nextOtpValue('', value, length);

  return (
    <View style={styles.row}>
      {Array.from({ length }, (_, index) => {
        const isActive =
          digits.length === index || (digits.length === length && index === length - 1);

        return (
          <View key={index} style={[styles.cell, isActive ? styles.cellActive : null]}>
            <Text style={styles.digit}>{digits[index] ?? ''}</Text>
          </View>
        );
      })}

      <TextInput
        autoCapitalize="none"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        autoCorrect={false}
        caretHidden
        importantForAutofill="yes"
        keyboardType={otpKeyboardType()}
        onChangeText={(next) => onChange(nextOtpValue(digits, next, length))}
        smartInsertDelete={false}
        spellCheck={false}
        style={styles.input}
        testID={testID}
        textContentType="oneTimeCode"
        underlineColorAndroid="transparent"
        value={digits}
      />
    </View>
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
  // Opacity must stay at 1. iOS does not hit-test a fully transparent
  // field, so the long-press paste menu never appears.
  input: {
    ...StyleSheet.absoluteFillObject,
    color: 'transparent',
    backgroundColor: 'transparent',
  },
});
