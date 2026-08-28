import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, fontWeight, spacing } from '@product/brand';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface AuthScreenHeaderProps {
  title: string;
  subtitle: string;
  onBackPress: () => void;
}

export function AuthScreenHeader({ title, subtitle, onBackPress }: AuthScreenHeaderProps) {
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

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.muted,
    fontSize: fontSize.md,
  },
});
