import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, radii, spacing } from '@product/brand';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type TextInputProps } from 'react-native';
import { TextField } from './TextField';
import type { PasswordRequirement } from './types';

interface PasswordFieldProps extends Omit<TextInputProps, 'secureTextEntry'> {
  hasError?: boolean;
  showLockIcon?: boolean;
  requirements?: readonly PasswordRequirement[];
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
  showLockIcon = true,
  requirements,
  value,
  ...inputProps
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const shouldShowChecklist = Boolean(requirements?.length) && Boolean(value);

  return (
    <View>
      <TextField
        autoCapitalize="none"
        autoCorrect={false}
        hasError={hasError}
        leadingIcon={showLockIcon ? 'lock' : undefined}
        secureTextEntry={!isVisible}
        trailing={
          <Pressable
            accessibilityLabel={isVisible ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setIsVisible((visible) => !visible)}
          >
            <Feather color={colors.muted} name={isVisible ? 'eye-off' : 'eye'} size={20} />
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
    borderRadius: radii.md,
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
