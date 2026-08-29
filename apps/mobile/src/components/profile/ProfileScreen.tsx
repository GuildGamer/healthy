import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Loader, RefreshableScroll } from '@/components/feedback';
import { healthCategories } from '@/constants/health-categories';
import { signOut, useSession } from '@/lib/auth-client';
import { apiClient } from '@/lib/api';
import { requestReminderPermission } from '@/lib/notifications';
import { usePushDeviceSync } from '@/lib/use-push-device';

function PreferenceRow({
  label,
  hint,
  isOn,
  isBusy,
  onToggle,
  testID,
}: {
  label: string;
  hint: string;
  isOn: boolean;
  isBusy: boolean;
  onToggle: (next: boolean) => void;
  testID: string;
}) {
  return (
    <View style={styles.preferenceRow}>
      <View style={styles.preferenceText}>
        <Text style={styles.preferenceLabel}>{label}</Text>
        <Text style={styles.preferenceHint}>{hint}</Text>
      </View>
      {isBusy ? (
        <Loader size="small" />
      ) : (
        <Switch
          accessibilityLabel={label}
          onValueChange={onToggle}
          testID={testID}
          thumbColor={colors.surface}
          trackColor={{ false: colors.disabledSurface, true: colors.accent }}
          value={isOn}
        />
      )}
    </View>
  );
}

export function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.me(),
  });

  const updateDisplayName = useMutation({
    mutationFn: (displayName: string) =>
      apiClient.updateDisplayName({ displayName }),
    onSuccess: async () => {
      setNameError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['me'] }),
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] }),
      ]);
    },
    onError: () => {
      setNameError(
        'Use 2 to 24 letters, numbers, spaces, dots, hyphens or underscores.',
      );
    },
  });

  const updateSettings = useMutation({
    mutationFn: (input: {
      reminderEnabled: boolean;
      evidenceRemindersEnabled: boolean;
      promotionalMessagesEnabled: boolean;
      showOnLeaderboard: boolean;
    }) => apiClient.updateNotificationSettings(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      await queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });

  const name = meQuery.data?.name ?? session?.user.name ?? 'Member';
  const email = meQuery.data?.email ?? session?.user.email ?? '';
  const selected = meQuery.data?.categories ?? [];
  const savedDisplayName = meQuery.data?.displayName ?? '';
  const reminderEnabled = meQuery.data?.reminderEnabled ?? false;
  usePushDeviceSync(reminderEnabled);
  const evidenceRemindersEnabled =
    meQuery.data?.evidenceRemindersEnabled ?? true;
  const promotionalMessagesEnabled =
    meQuery.data?.promotionalMessagesEnabled ?? false;
  const showOnLeaderboard = meQuery.data?.showOnLeaderboard ?? true;
  const pointsBalance = meQuery.data?.pointsBalance ?? 0;
  const streakDays = meQuery.data?.currentStreakDays ?? 0;

  const [draftName, setDraftName] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const nameValue = draftName ?? savedDisplayName;
  const canSaveName =
    nameValue.trim().length >= 2 &&
    nameValue.trim() !== savedDisplayName &&
    !updateDisplayName.isPending;

  const selectedLabels = healthCategories
    .filter((category) => selected.includes(category.id))
    .map((category) => category.name)
    .join(', ');

  function saveDisplayName() {
    if (!canSaveName) {
      return;
    }

    updateDisplayName.mutate(nameValue.trim());
  }

  async function saveSettings(next: {
    reminderEnabled?: boolean;
    evidenceRemindersEnabled?: boolean;
    promotionalMessagesEnabled?: boolean;
    showOnLeaderboard?: boolean;
  }) {
    const reminderNext = next.reminderEnabled ?? reminderEnabled;

    if (reminderNext && !reminderEnabled) {
      const granted = await requestReminderPermission();
      if (!granted) {
        return;
      }
    }

    updateSettings.mutate({
      reminderEnabled: reminderNext,
      evidenceRemindersEnabled:
        next.evidenceRemindersEnabled ?? evidenceRemindersEnabled,
      promotionalMessagesEnabled:
        next.promotionalMessagesEnabled ?? promotionalMessagesEnabled,
      showOnLeaderboard: next.showOnLeaderboard ?? showOnLeaderboard,
    });
  }

  return (
    <RefreshableScroll
      contentContainerStyle={styles.content}
      onPullRefresh={() => meQuery.refetch()}
      style={styles.container}
      testID="profile-screen"
    >
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Feather color={colors.accent} name="user" size={28} />
        </View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.email}>{email}</Text>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{streakDays}</Text>
            <Text style={styles.statLabel}>Day streak</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {pointsBalance.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Username</Text>
          {updateDisplayName.isPending ? (
            <Loader size="small" />
          ) : null}
        </View>
        <Text style={styles.sectionHint}>
          This is the only thing others see. Your real name and email stay
          private.
        </Text>
        <View style={styles.nameRow}>
          <TextInput
            autoCapitalize="words"
            maxLength={24}
            onChangeText={setDraftName}
            onSubmitEditing={saveDisplayName}
            placeholder="Choose a username"
            placeholderTextColor={colors.disabledText}
            returnKeyType="done"
            style={styles.nameInput}
            testID="display-name-input"
            value={nameValue}
          />
          <Pressable
            accessibilityRole="button"
            disabled={!canSaveName}
            onPress={saveDisplayName}
            style={({ pressed }) => [
              styles.saveButton,
              !canSaveName ? styles.saveButtonDisabled : null,
              pressed && canSaveName ? styles.saveButtonPressed : null,
            ]}
            testID="display-name-save"
          >
            <Text
              style={[
                styles.saveLabel,
                !canSaveName ? styles.saveLabelDisabled : null,
              ]}
            >
              Save
            </Text>
          </Pressable>
        </View>
        {nameError ? <Text style={styles.nameError}>{nameError}</Text> : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.cardBlock}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/edit-profile')}
            style={styles.accountRow}
            testID="open-edit-profile"
          >
            <View style={styles.linkText}>
              <Text style={styles.linkLabel}>Edit Profile</Text>
              <Text style={styles.linkHint}>Name and email</Text>
            </View>
            <Feather color={colors.muted} name="chevron-right" size={18} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/health-categories')}
            style={styles.accountRow}
            testID="open-health-categories"
          >
            <View style={styles.linkText}>
              <Text style={styles.linkLabel}>Health Categories</Text>
              <Text style={styles.linkHint}>
                {selectedLabels || 'Choose the conditions you track'}
              </Text>
            </View>
            <Feather color={colors.muted} name="chevron-right" size={18} />
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.cardBlock}>
          <PreferenceRow
            hint="A nudge when today's challenges are still open."
            isBusy={updateSettings.isPending}
            isOn={reminderEnabled}
            label="Daily challenge reminders"
            onToggle={(next) => saveSettings({ reminderEnabled: next })}
            testID="toggle-daily-reminders"
          />
          <View style={styles.divider} />
          <PreferenceRow
            hint="When a challenge needs a photo or reading."
            isBusy={updateSettings.isPending}
            isOn={evidenceRemindersEnabled}
            label="Evidence reminders"
            onToggle={(next) =>
              saveSettings({ evidenceRemindersEnabled: next })
            }
            testID="toggle-evidence-reminders"
          />
          <View style={styles.divider} />
          <PreferenceRow
            hint="Tips and product updates."
            isBusy={updateSettings.isPending}
            isOn={promotionalMessagesEnabled}
            label="Promotional messages"
            onToggle={(next) =>
              saveSettings({ promotionalMessagesEnabled: next })
            }
            testID="toggle-promotional-messages"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy</Text>
        <View style={styles.cardBlock}>
          <PreferenceRow
            hint="Turn off to hide your username from the public board."
            isBusy={updateSettings.isPending}
            isOn={showOnLeaderboard}
            label="Show me on leaderboard"
            onToggle={(next) => saveSettings({ showOnLeaderboard: next })}
            testID="toggle-show-on-leaderboard"
          />
        </View>
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
    </RefreshableScroll>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
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
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.lg,
  },
  stat: {
    alignItems: 'center',
    minWidth: 80,
  },
  statValue: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  statLabel: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: colors.border,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nameInput: {
    flex: 1,
    minHeight: 44,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
  },
  saveButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.accentContainer,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  saveButtonPressed: {
    backgroundColor: colors.accentContainerPressed,
  },
  saveButtonDisabled: {
    backgroundColor: colors.disabledSurface,
    borderColor: colors.border,
  },
  saveLabel: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  saveLabelDisabled: {
    color: colors.disabledText,
  },
  nameError: {
    color: colors.danger,
    fontSize: fontSize.sm,
  },
  sectionHint: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
  accountRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  linkText: {
    flex: 1,
    gap: 2,
  },
  linkLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  linkHint: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
  cardBlock: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  preferenceText: {
    flex: 1,
    gap: 2,
  },
  preferenceLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  preferenceHint: {
    color: colors.muted,
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md,
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
