import { fontSize, fontWeight, spacing } from '@product/brand';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeckNavButton } from '@/components/deck';
import { RefreshableScroll } from '@/components/feedback';
import { Glyph } from '@/components/icons';
import { useRefreshProgress, YouProgress } from '@/components/progress';
import { useSession } from '@/lib/auth-client';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { avatarNameFor, ProfileAvatar } from './ProfileAvatar';
import { useMe } from './useMe';

const IDENTITY_AVATAR_SIZE = 44;

/** The You tab: who you are to others, how you're doing, with Settings behind the gear. */
export function ProfileScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const meQuery = useMe();
  const refreshProgress = useRefreshProgress();

  return (
    <View style={styles.container}>
      <RefreshableScroll
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}
        onPullRefresh={() => Promise.all([meQuery.refetch(), refreshProgress()])}
        testID="profile-screen"
      >
        <View style={styles.titleRow}>
          <Text accessibilityRole="header" style={styles.title}>
            You
          </Text>
          <DeckNavButton
            accessibilityLabel="Settings"
            glyph="settings"
            onPage
            onPress={() => router.push('/settings')}
            testID="open-settings"
          />
        </View>
        <IdentityRow onPress={() => router.push('/settings/profile')} />
        <YouProgress />
      </RefreshableScroll>
    </View>
  );
}

/** Your photo and the name others see, a quiet way into Profile. */
function IdentityRow({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { data: session } = useSession();
  const me = useMe().data;
  const publicName = avatarNameFor({
    displayName: me?.displayName,
    name: me?.name ?? session?.user.name,
  });

  return (
    <Pressable
      accessibilityHint="Opens your profile"
      accessibilityLabel={publicName}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.identity, pressed ? styles.pressed : null]}
      testID="you-open-profile"
    >
      <ProfileAvatar imageUri={session?.user.image} name={publicName} size={IDENTITY_AVATAR_SIZE} />
      <View style={styles.identityText}>
        <Text numberOfLines={1} style={styles.identityName}>
          {publicName}
        </Text>
        <Text style={styles.identityMeta}>How others see you</Text>
      </View>
      <Glyph color={colors.muted} name="forward" size={16} strokeWidth={2} />
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: spacing.xl,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      color: theme.colors.text,
      fontSize: fontSize.xxl,
      fontWeight: fontWeight.semibold,
      letterSpacing: -1,
      paddingHorizontal: spacing.xs,
    },
    identity: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: spacing.md,
      paddingHorizontal: spacing.xs,
    },
    pressed: {
      opacity: 0.7,
    },
    identityText: {
      flex: 1,
      minWidth: 0,
    },
    identityName: {
      color: theme.colors.text,
      fontSize: fontSize.md,
      fontWeight: fontWeight.medium,
    },
    identityMeta: {
      color: theme.colors.muted,
      fontSize: fontSize.xs,
      marginTop: 2,
    },
  });
