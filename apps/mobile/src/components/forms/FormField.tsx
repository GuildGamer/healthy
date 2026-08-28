import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, spacing } from '@product/brand';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface FormFieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

interface FieldMessageProps {
  hint?: string;
  error?: string;
}

function FieldMessage({ hint, error }: FieldMessageProps) {
  if (error) {
    return (
      <View style={styles.errorRow}>
        <Feather color={colors.danger} name="alert-circle" size={14} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (hint) {
    return <Text style={styles.hintText}>{hint}</Text>;
  }

  return null;
}

export function FormField({ label, hint, error, required = false, children }: FormFieldProps) {
  return (
    <View>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.requiredMark}> *</Text> : null}
        </Text>
      ) : null}

      {children}

      <FieldMessage error={error} hint={hint} />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.text,
    fontSize: fontSize.sm,
    marginBottom: 6,
  },
  requiredMark: {
    color: colors.danger,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 6,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.xs,
    flexShrink: 1,
  },
  hintText: {
    color: colors.muted,
    fontSize: fontSize.xs,
    marginTop: 6,
  },
});
