import { fontWeight } from '@product/brand';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Glyph } from '@/components/icons';
import { useSession } from '@/lib/auth-client';
import { goBackOrHome } from '@/lib/go-back';
import { useNotificationPermission } from '@/lib/use-notification-permission';
import {
  appearanceLabel,
  type Theme,
  useAppearancePreference,
  useTheme,
  useThemedStyles,
} from '@/theme';
import { avatarNameFor, ProfileAvatar } from './ProfileAvatar';
import { SettingsGroup, SettingsLinkRow } from '@/components/settings';
import { SettingsPage } from './SettingsPage';
import {
  membershipValue,
  movementValue,
  notificationsValue,
  privacyValue,
} from './settings-values';
import { useMe, useMembershipOffer } from './useMe';

const WHO_AVATAR_SIZE = 56;

/** From the gear on You: short groups of rows, each showing what is set now. */
export function SettingsScreen() {
  const router = useRouter();
  const me = useMe().data;
  const hasMembership = me?.hasMembership ?? false;
  const offer = useMembershipOffer(hasMembership).data;
  const permission = useNotificationPermission();
  const notifications = me ? notificationsValue(permission, me, hasMembership) : null;
  const { preference } = useAppearancePreference();

  return (
    <SettingsPage
      onBack={() => goBackOrHome('/(tabs)/profile')}
      testID="settings-screen"
      title="Settings"
    >
      <WhoCard onPress={() => router.push('/settings/profile')} />
      <SettingsGroup>
        <SettingsLinkRow
          glyph="bell"
          label="Notifications"
          onPress={() => router.push('/settings/notifications')}
          testID="open-notification-settings"
          value={notifications?.label}
          valueTone={notifications?.tone}
        />
        <SettingsLinkRow
          glyph="moon"
          label="Appearance"
          onPress={() => router.push('/settings/appearance')}
          testID="open-appearance"
          value={appearanceLabel(preference)}
        />
        <SettingsLinkRow
          glyph="eye"
          label="Privacy"
          onPress={() => router.push('/settings/privacy')}
          testID="open-privacy"
          value={me ? privacyValue(me.showOnLeaderboard) : null}
        />
      </SettingsGroup>
      <SettingsGroup>
        <SettingsLinkRow
          glyph="watch"
          label="Movement & sleep"
          onPress={() => router.push('/settings/movement')}
          testID="open-health-link"
          value={me ? movementValue(me.healthLinkStatus) : null}
        />
      </SettingsGroup>
      <SettingsGroup>
        <SettingsLinkRow
          glyph="star"
          label="Membership"
          onPress={() => router.push({ pathname: '/membership', params: { source: 'profile' } })}
          testID="open-membership"
          value={me ? membershipValue(hasMembership, offer?.currentSubscription) : null}
        />
        <SettingsLinkRow
          glyph="key"
          label="Account"
          onPress={() => router.push('/settings/account')}
          testID="open-account"
        />
        <SettingsLinkRow
          glyph="help"
          label="Help and feedback"
          onPress={() => router.push('/settings/help')}
          testID="open-help"
        />
      </SettingsGroup>
    </SettingsPage>
  );
}

function WhoCard({ onPress }: { onPress: () => void }) {
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
      accessibilityHint="Profile and the name others see"
      accessibilityLabel={publicName}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
      testID="open-edit-profile"
    >
      <ProfileAvatar imageUri={session?.user.image} name={publicName} size={WHO_AVATAR_SIZE} />
      <View style={styles.text}>
        <Text numberOfLines={1} style={styles.name}>
          {publicName}
        </Text>
        <Text style={styles.meta}>Profile and the name others see</Text>
      </View>
      <Glyph color={colors.muted} name="forward" size={16} strokeWidth={2} />
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 14,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
    },
    pressed: {
      opacity: 0.7,
    },
    text: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      color: theme.colors.text,
      fontSize: 17,
      fontWeight: fontWeight.medium,
    },
    meta: {
      color: theme.colors.muted,
      fontSize: 13,
      marginTop: 2,
    },
  });
