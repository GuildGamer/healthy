import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, radii, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';

interface FormErrorBannerProps {
  message: string;
}

export function FormErrorBanner({ message }: FormErrorBannerProps) {
  return (
    <View accessibilityRole="alert" style={styles.banner} testID="form-error-banner">
      <Feather color={colors.danger} name="alert-circle" size={16} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  message: {
    color: colors.danger,
    fontSize: fontSize.sm,
    flexShrink: 1,
  },
});
