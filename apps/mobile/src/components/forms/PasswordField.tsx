import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, radii, spacing } from '@product/brand';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type TextInputProps } from 'react-native';
import { FieldMark } from './FieldMark';
import { TextField } from './TextField';
import type { PasswordRequirement } from './types';

interface PasswordFieldProps extends Omit<TextInputProps, 'secureTextEntry'> {
  hasError?: boolean;
  showMark?: boolean;
  requirements?: readonly PasswordRequirement[];
}

function allRequirementsMet(
  requirements: readonly PasswordRequirement[],
): boolean {
  return requirements.every((requirement) => requirement.valid);
}

function RequirementChecklist({
  requirements,
}: {
  requirements: readonly PasswordRequirement[];
}) {
  return (
    <View style={styles.checklist}>
      <Text style={styles.checklistTitle}>Password must contain:</Text>

      {requirements.map((requirement) => (
        <View key={requirement.text} style={styles.checklistRow}>
          <View
            style={[
              styles.checkDot,
              requirement.valid ? styles.checkDotValid : styles.checkDotPending,
            ]}
          >
            {requirement.valid ? (
              <Feather color={colors.onAccent} name="check" size={10} />
            ) : null}
          </View>

          <Text style={requirement.valid ? styles.requirementMet : styles.requirementPending}>
            {requirement.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function PasswordField({
  hasError = false,
  showMark = true,
  requirements,
  value,
  onBlur,
  onFocus,
  ...inputProps
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const hasRequirements = Boolean(requirements?.length);
  const hasValue = Boolean(value);
  const requirementsComplete =
    hasRequirements && requirements ? allRequirementsMet(requirements) : false;

  // Show while editing; collapse once every rule is met and focus leaves.
  const shouldShowChecklist =
    hasRequirements &&
    hasValue &&
    (isFocused || !requirementsComplete);

  return (
    <View>
      <TextField
        autoCapitalize="none"
        autoCorrect={false}
        hasError={hasError}
        leading={showMark ? <FieldMark role="password" /> : undefined}
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        secureTextEntry={!isVisible}
        trailing={
          <Pressable
            accessibilityLabel={isVisible ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setIsVisible((visible) => !visible)}
          >
            <Feather
              color={colors.muted}
              name={isVisible ? 'eye-off' : 'eye'}
              size={20}
            />
          </Pressable>
        }
        value={value}
        {...inputProps}
      />

      {shouldShowChecklist && requirements ? (
        <RequirementChecklist requirements={requirements} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  checklist: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  checklistTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkDot: {
    width: 16,
    height: 16,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDotValid: {
    backgroundColor: colors.accent,
  },
  checkDotPending: {
    backgroundColor: colors.disabledSurface,
  },
  requirementMet: {
    color: colors.accent,
    fontSize: fontSize.xs,
  },
  requirementPending: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
});
