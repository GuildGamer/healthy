import { colors, spacing } from '@product/brand';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { apiClient } from '@/lib/api';

export function HomeScreen() {
  const [healthStatus, setHealthStatus] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  async function handleCheckHealth() {
    setIsChecking(true);
    setHealthStatus(null);

    try {
      const result = await apiClient.health();
      setHealthStatus(`${result.status} · ${result.service}`);
    } catch {
      setHealthStatus('unreachable');
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Healthy</Text>
      <Text style={styles.subtitle}>Mobile home</Text>

      <View
        accessibilityLabel="Brand accent color"
        style={[styles.accentSwatch, { backgroundColor: colors.accent }]}
        testID="brand-accent"
      />
      <Text style={styles.caption}>Brand accent · {colors.accent}</Text>

      <Pressable
        accessibilityRole="button"
        disabled={isChecking}
        onPress={handleCheckHealth}
        style={({ pressed }) => [
          styles.button,
          (pressed || isChecking) && styles.buttonPressed,
        ]}
      >
        {isChecking ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.buttonLabel}>Check API health</Text>
        )}
      </Pressable>

      {healthStatus ? <Text style={styles.status}>{healthStatus}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
  },
  accentSwatch: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginTop: spacing.sm,
  },
  caption: {
    color: colors.muted,
    fontSize: 14,
  },
  button: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  status: {
    color: colors.text,
    fontSize: 14,
  },
});
