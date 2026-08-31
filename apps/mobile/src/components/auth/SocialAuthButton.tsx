import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type SocialAuthButtonProps = {
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  testID?: string;
};

/** Shared Google entry on login and sign-up. */
export function GoogleAuthButton({
  disabled = false,
  loading = false,
  onPress,
  testID = 'auth-google',
}: SocialAuthButtonProps) {
  const isInactive = disabled || loading;

  return (
    <Pressable
      accessibilityLabel="Continue with Google"
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy: loading }}
      disabled={isInactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && !isInactive ? styles.buttonPressed : null,
        isInactive ? styles.buttonInactive : null,
      ]}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <>
          <MaterialCommunityIcons color={colors.text} name="google" size={18} />
          <Text style={styles.label}>Continue with Google</Text>
        </>
      )}
    </Pressable>
  );
}

export function AuthMethodDivider() {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerLabel}>or</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  buttonPressed: {
    backgroundColor: colors.surfaceRaised,
  },
  buttonInactive: {
    opacity: 0.55,
  },
  label: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerLabel: {
    color: colors.muted,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
