import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { StyleSheet, Text } from 'react-native';
import { FormButton } from '@/components/forms';
import { Glyph } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';

type AuthChoiceButtonProps = {
  disabled?: boolean;
  loading?: boolean;
  /** Marks the way in this phone used last, on Welcome back. */
  isLastUsed?: boolean;
  onPress: () => void;
  testID?: string;
};

export function GoogleAuthButton({
  disabled = false,
  loading = false,
  isLastUsed = false,
  onPress,
  testID = 'auth-google',
}: AuthChoiceButtonProps) {
  const { colors } = useTheme();

  return (
    <FormButton
      disabled={disabled}
      label="Continue with Google"
      leading={<MaterialCommunityIcons color={colors.text} name="google" size={18} />}
      loading={loading}
      onPress={onPress}
      testID={testID}
      trailing={isLastUsed ? <LastUsedTag /> : null}
      variant="outline"
    />
  );
}

export function EmailAuthButton({
  disabled = false,
  isLastUsed = false,
  onPress,
  testID = 'auth-email',
}: Omit<AuthChoiceButtonProps, 'loading'>) {
  const { colors } = useTheme();

  return (
    <FormButton
      disabled={disabled}
      label="Continue with email"
      leading={<Glyph color={colors.text} name="mail" size={19} strokeWidth={2} />}
      onPress={onPress}
      testID={testID}
      trailing={isLastUsed ? <LastUsedTag /> : null}
      variant="outline"
    />
  );
}

function LastUsedTag() {
  const styles = useThemedStyles(createStyles);

  return <Text style={styles.lastUsed}>Last used</Text>;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    lastUsed: {
      marginLeft: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radii.sm,
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceRaised,
      color: theme.colors.muted,
      fontSize: fontSize.xs,
      fontWeight: fontWeight.medium,
    },
  });
