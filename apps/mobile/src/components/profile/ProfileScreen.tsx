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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Loader, RefreshableScroll } from '@/components/feedback';
import { ConnectHealthSheet } from '@/components/health/ConnectHealthSheet';
import { healthCategories } from '@/constants/health-categories';
import { signOut, useSession } from '@/lib/auth-client';
import { apiClient } from '@/lib/api';
import { tipQuoteFontFamily } from '@/lib/fonts';
import { requestReminderPermission } from '@/lib/notifications';
import { usePushDeviceSync } from '@/lib/use-push-device';
import { ChangePhotoSheet } from './ChangePhotoSheet';
import { ProfileAvatar, avatarNameFor } from './ProfileAvatar';
import { useUpdateProfilePhoto } from './useUpdateProfilePhoto';

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

function LinkRow({
  hint,
  label,
  onPress,
  testID,
}: {
  hint: string;
  label: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.linkRow, pressed && styles.rowPressed]}
      testID={testID}
    >
      <View style={styles.linkText}>
        <Text style={styles.linkLabel}>{label}</Text>
        <Text style={styles.linkHint}>{hint}</Text>
      </View>
      <Feather color={colors.border} name="chevron-right" size={16} />
    </Pressable>
  );
}

export function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      inProgressNudgeEnabled: boolean;
      inProgressNudgeDelayMinutes: number;
    }) => apiClient.updateNotificationSettings(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      await queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });

  const legalName = meQuery.data?.name ?? session?.user.name ?? 'Member';
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
  const inProgressNudgeEnabled =
    meQuery.data?.inProgressNudgeEnabled ?? true;
  const inProgressNudgeDelayMinutes =
    meQuery.data?.inProgressNudgeDelayMinutes ?? 30;
  const pointsBalance = meQuery.data?.pointsBalance ?? 0;
  const streakDays = meQuery.data?.currentStreakDays ?? 0;

  const [draftName, setDraftName] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [healthSheetOpen, setHealthSheetOpen] = useState(false);
  const healthLinkStatus = meQuery.data?.healthLinkStatus ?? 'unknown';
  const healthLinkHint =
    healthLinkStatus === 'connected'
      ? 'Phone sensors on'
      : healthLinkStatus === 'denied'
        ? 'Off — walks still work by hand'
        : 'Phone or watch';
  const nameValue = draftName ?? savedDisplayName;
  const canSaveName =
    nameValue.trim().length >= 2 &&
    nameValue.trim() !== savedDisplayName &&
    !updateDisplayName.isPending;

  const selectedLabels = healthCategories
    .filter((category) => selected.includes(category.id))
    .map((category) => category.name)
    .join(' · ');

  const heroName = savedDisplayName || legalName;
  const photoUri = session?.user.image;
  const photo = useUpdateProfilePhoto();

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
    inProgressNudgeEnabled?: boolean;
    inProgressNudgeDelayMinutes?: number;
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
      inProgressNudgeEnabled:
        next.inProgressNudgeEnabled ?? inProgressNudgeEnabled,
      inProgressNudgeDelayMinutes:
        next.inProgressNudgeDelayMinutes ?? inProgressNudgeDelayMinutes,
    });
  }

  return (
    <View style={styles.container}>
      <RefreshableScroll
        contentContainerStyle={styles.content}
        onPullRefresh={() => meQuery.refetch()}
        style={styles.scroll}
        testID="profile-screen"
      >
        <View style={[styles.hero, { paddingTop: insets.top + spacing.md }]}>
          <Text style={styles.pageTitle}>Profile</Text>

          <View style={styles.identity}>
            <ProfileAvatar
              imageUri={photoUri}
              name={avatarNameFor({
                displayName: savedDisplayName,
                name: legalName,
              })}
              onEditPress={photo.openSheet}
              testID="profile-avatar"
            />
            <Text style={styles.heroName}>{heroName}</Text>
            {email ? <Text style={styles.heroMeta}>{email}</Text> : null}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/points')}
            style={styles.statsRow}
            testID="profile-activity"
          >
            <View style={styles.stat}>
              <Text style={styles.statValue}>{streakDays}</Text>
              <Text style={styles.statLabel}>
                {streakDays === 1 ? 'day' : 'days'}
              </Text>
            </View>
            <View style={styles.statRule} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {pointsBalance.toLocaleString('en-GB')}
              </Text>
              <Text style={styles.statLabel}>points</Text>
            </View>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>On the board</Text>
        <Text style={styles.sectionHint}>
          The only name others see. Yours stays private.
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
          {updateDisplayName.isPending ? (
            <Loader size="small" />
          ) : (
            <Pressable
              accessibilityRole="button"
              disabled={!canSaveName}
              onPress={saveDisplayName}
              style={styles.saveHit}
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
          )}
        </View>
        {nameError ? <Text style={styles.nameError}>{nameError}</Text> : null}

        <Text style={styles.sectionTitle}>Focus</Text>
        <LinkRow
          hint={selectedLabels || 'Choose what you track'}
          label="Conditions"
          onPress={() => router.push('/health-categories')}
          testID="open-health-categories"
        />
        <View style={styles.divider} />
        <LinkRow
          hint={healthLinkHint}
          label="Movement & watch"
          onPress={() => setHealthSheetOpen(true)}
          testID="open-health-link"
        />
        <View style={styles.divider} />
        <LinkRow
          hint={legalName}
          label="Name and email"
          onPress={() => router.push('/edit-profile')}
          testID="open-edit-profile"
        />

        <Text style={styles.sectionTitle}>Nudges</Text>
        <PreferenceRow
          hint="When today's list is still open"
          isBusy={updateSettings.isPending}
          isOn={reminderEnabled}
          label="Daily reminders"
          onToggle={(next) => saveSettings({ reminderEnabled: next })}
          testID="toggle-daily-reminders"
        />
        <View style={styles.divider} />
        <PreferenceRow
          hint="Photos and readings"
          isBusy={updateSettings.isPending}
          isOn={evidenceRemindersEnabled}
          label="Evidence"
          onToggle={(next) =>
            saveSettings({ evidenceRemindersEnabled: next })
          }
          testID="toggle-evidence-reminders"
        />
        <View style={styles.divider} />
        <PreferenceRow
          hint="If you leave a log unfinished"
          isBusy={updateSettings.isPending}
          isOn={inProgressNudgeEnabled}
          label="Finish what you started"
          onToggle={(next) =>
            saveSettings({ inProgressNudgeEnabled: next })
          }
          testID="toggle-in-progress-nudge"
        />
        {inProgressNudgeEnabled ? (
          <View style={styles.delayRow}>
            {[15, 30, 60, 120].map((minutes) => (
              <Pressable
                key={minutes}
                onPress={() =>
                  saveSettings({ inProgressNudgeDelayMinutes: minutes })
                }
                style={[
                  styles.delayChip,
                  inProgressNudgeDelayMinutes === minutes &&
                    styles.delayChipOn,
                ]}
                testID={`nudge-delay-${minutes}`}
              >
                <Text
                  style={[
                    styles.delayChipLabel,
                    inProgressNudgeDelayMinutes === minutes &&
                      styles.delayChipLabelOn,
                  ]}
                >
                  {minutes}m
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <View style={styles.divider} />
        <PreferenceRow
          hint="Tips and product notes"
          isBusy={updateSettings.isPending}
          isOn={promotionalMessagesEnabled}
          label="Promotional"
          onToggle={(next) =>
            saveSettings({ promotionalMessagesEnabled: next })
          }
          testID="toggle-promotional-messages"
        />

        <Text style={styles.sectionTitle}>Board</Text>
        <PreferenceRow
          hint="Hide your username from the weekly list"
          isBusy={updateSettings.isPending}
          isOn={showOnLeaderboard}
          label="Show me this week"
          onToggle={(next) => saveSettings({ showOnLeaderboard: next })}
          testID="toggle-show-on-leaderboard"
        />

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
      <ConnectHealthSheet
        onClose={() => setHealthSheetOpen(false)}
        visible={healthSheetOpen}
      />
      <ChangePhotoSheet
        errorMessage={photo.errorMessage}
        isSaving={photo.isSaving}
        onClose={photo.closeSheet}
        onPick={photo.pickFrom}
        visible={photo.sheetOpen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    paddingBottom: spacing.xl,
  },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  pageTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  identity: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  heroName: {
    color: colors.text,
    fontFamily: tipQuoteFontFamily,
    fontSize: fontSize.xl,
    textAlign: 'center',
  },
  heroMeta: {
    color: colors.muted,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingTop: spacing.xs,
  },
  stat: {
    alignItems: 'center',
    minWidth: 72,
    gap: 2,
  },
  statValue: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  statLabel: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
  statRule: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: colors.border,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  sectionHint: {
    color: colors.muted,
    fontSize: fontSize.xs,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  nameInput: {
    flex: 1,
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingHorizontal: 0,
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: tipQuoteFontFamily,
  },
  saveHit: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  rowPressed: {
    opacity: 0.7,
  },
  linkText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  linkLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
  },
  linkHint: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  preferenceText: {
    flex: 1,
    gap: 2,
  },
  preferenceLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
  },
  preferenceHint: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  delayRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  delayChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  delayChipOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentContainer,
  },
  delayChipLabel: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
  delayChipLabelOn: {
    color: colors.accent,
  },
  logoutButton: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  logoutLabel: {
    color: colors.muted,
    fontSize: fontSize.sm,
  },
});
