import Feather from '@expo/vector-icons/Feather';
import { fontSize, spacing } from '@product/brand';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { displayFontFamily } from '@/lib/fonts';
import { type Theme, useTheme, useThemedStyles } from '@/theme';

interface AuthScreenHeaderProps {
  title: string;
  subtitle: string;
  onBackPress: () => void;
}

export function AuthScreenHeader({ title, subtitle, onBackPress }: AuthScreenHeaderProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        hitSlop={12}
        onPress={onBackPress}
        style={styles.backButton}
        testID="auth-back"
      >
        <Feather color={colors.muted} name="arrow-left" size={24} />
      </Pressable>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      marginBottom: spacing.lg,
    },
    backButton: {
      alignSelf: 'flex-start',
      marginBottom: spacing.lg,
    },
    title: {
      color: theme.colors.text,
      fontFamily: displayFontFamily,
      fontSize: fontSize.xl,
      marginBottom: spacing.sm,
    },
    subtitle: {
      color: theme.colors.muted,
      fontSize: fontSize.md,
    },
  });
