import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';

export function SplashScreen() {
  return (
    <View style={styles.container} testID="splash-screen">
      <View style={styles.logoBadge}>
        <Feather color={colors.onAccent} name="heart" size={56} />
      </View>

      <Text style={styles.title}>Healthy</Text>
      <Text style={styles.tagline}>Turn your health into a game.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  logoBadge: {
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
  },
  tagline: {
    color: colors.muted,
    fontSize: fontSize.md,
    textAlign: 'center',
  },
});
