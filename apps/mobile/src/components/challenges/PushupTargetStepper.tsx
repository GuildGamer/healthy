import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PUSHUP_TARGET_MAX, PUSHUP_TARGET_MIN, stepPushupTarget } from './pushup-target';

export function PushupTargetStepper({
  value,
  onChange,
  testID = 'pushup-target-stepper',
}: {
  value: number;
  onChange: (next: number) => void;
  testID?: string;
}) {
  const canDecrease = value > PUSHUP_TARGET_MIN;
  const canIncrease = value < PUSHUP_TARGET_MAX;

  return (
    <View style={styles.row} testID={testID}>
      <Pressable
        accessibilityLabel="Fewer push-ups"
        accessibilityRole="button"
        disabled={!canDecrease}
        onPress={() => onChange(stepPushupTarget(value, -1))}
        style={[styles.step, !canDecrease ? styles.stepDisabled : null]}
        testID={`${testID}-dec`}
      >
        <Feather color={canDecrease ? colors.text : colors.muted} name="minus" size={18} />
      </Pressable>
      <Text style={styles.value} testID={`${testID}-value`}>
        {value}
      </Text>
      <Pressable
        accessibilityLabel="More push-ups"
        accessibilityRole="button"
        disabled={!canIncrease}
        onPress={() => onChange(stepPushupTarget(value, 1))}
        style={[styles.step, !canIncrease ? styles.stepDisabled : null]}
        testID={`${testID}-inc`}
      >
        <Feather color={canIncrease ? colors.text : colors.muted} name="plus" size={18} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  step: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepDisabled: {
    opacity: 0.4,
  },
  value: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    minWidth: 48,
    textAlign: 'center',
  },
});
