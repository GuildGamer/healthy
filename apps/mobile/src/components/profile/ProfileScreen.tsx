import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { signOut, useSession } from '@/lib/auth-client';
import { apiClient } from '@/lib/api';

export function ProfileScreen() {
  const { data: session } = useSession();
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.me(),
  });

  const name = meQuery.data?.name ?? session?.user.name ?? 'Member';
  const email = meQuery.data?.email ?? session?.user.email ?? '';

  return (
    <View style={styles.container} testID="profile-screen">
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Feather color={colors.accent} name="user" size={28} />
        </View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.email}>{email}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void signOut();
        }}
        style={styles.logoutButton}
        testID="profile-sign-out"
      >
        <Text style={styles.logoutLabel}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  name: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  email: {
    color: colors.muted,
    fontSize: fontSize.sm,
  },
  logoutButton: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  logoutLabel: {
    color: colors.danger,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
