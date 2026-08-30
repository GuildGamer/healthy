import Feather from '@expo/vector-icons/Feather';
import type { ChallengeFrequency, ChallengeHistoryEntry } from '@product/client';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { healthCategories } from '@/constants/health-categories';
import { apiClient } from '@/lib/api';
import { formatReminderMinute } from '@/lib/notifications';
import { ScreenLoader } from '@/components/feedback';
import { FormButton } from '@/components/forms';
import {
  frequencyLabel,
  frequencyOptions,
} from './constants/frequency-labels';
import { completionRoute } from './completion-route';
import { primaryActionLabel } from './primary-action';
import {
  defaultReminderMinute,
  maxRemindersPerChallenge,
} from './constants/reminder-times';
import { formatPointsDelta } from '@/components/points/points-scope';
import {
  CHALLENGE_DETAIL_TABS,
  type ChallengeDetailTab,
} from './challenge-detail-tab';
import {
  formatHistoryWhen,
  historyEvidenceCopy,
  historyLogCopy,
  mergeTodayIntoHistory,
} from './challenge-history';
import { ChallengeIcon } from './ChallengeIcon';
import { TimePickerModal } from './TimePickerModal';

function sameMinutes(left: number[], right: number[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const sortedRight = [...right].sort((a, b) => a - b);
  return [...left]
    .sort((a, b) => a - b)
    .every((minute, index) => minute === sortedRight[index]);
}

function ChallengeHistoryPanel({
  entries,
  isError,
  isPending,
}: {
  entries: ChallengeHistoryEntry[];
  isError: boolean;
  isPending: boolean;
}) {
  if (isPending && entries.length === 0) {
    return <Text style={styles.historyEmpty}>Loading past completions.</Text>;
  }

  if (entries.length === 0) {
    if (isError) {
      return (
        <Text style={styles.historyEmpty} testID="challenge-history-error">
          Could not load history. Pull back and open this tab again.
        </Text>
      );
    }

    return (
      <Text style={styles.historyEmpty} testID="challenge-history-empty">
        Finish this challenge and it will show up here.
      </Text>
    );
  }

  return (
    <View style={styles.historyList} testID="challenge-history-list">
      {entries.map((entry, index) => {
        const evidence = historyEvidenceCopy(entry.evidence);
        const isLast = index === entries.length - 1;

        return (
          <View key={entry.id}>
            <View
              style={styles.historyRow}
              testID={`challenge-history-${entry.id}`}
            >
              <View style={styles.historyBody}>
                <Text style={styles.historySummary}>
                  {historyLogCopy(entry.log)}
                </Text>
                <Text style={styles.historyMeta}>
                  {formatHistoryWhen(entry.completedAt)}
                  {evidence ? ` · ${evidence}` : ''}
                </Text>
              </View>
              <Text
                style={[
                  styles.historyDelta,
                  entry.pointsDelta < 0 ? styles.historyDeltaPenalty : null,
                ]}
              >
                {formatPointsDelta(entry.pointsDelta)}
              </Text>
            </View>
            {isLast ? null : <View style={styles.historyDivider} />}
          </View>
        );
      })}
    </View>
  );
}

export function ChallengeDetailScreen({ challengeId }: { challengeId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const catalogQuery = useQuery({
    queryKey: ['challenges', 'catalog'],
    queryFn: () => apiClient.listChallengeCatalog(),
  });
  const todayQuery = useQuery({
    queryKey: ['challenges', 'today'],
    queryFn: () => apiClient.listTodayChallenges(),
  });
  const historyQuery = useQuery({
    queryKey: ['challenges', 'history', challengeId],
    queryFn: () => apiClient.listChallengeHistory({ challengeId }),
  });

  const challenge = catalogQuery.data?.challenges.find(
    (item) => item.challengeId === challengeId,
  );
  const occurrence = todayQuery.data?.challenges.find(
    (item) => item.challengeId === challengeId,
  );

  const [tab, setTab] = useState<ChallengeDetailTab>('details');
  const [frequency, setFrequency] = useState<ChallengeFrequency>('daily');
  const [minutes, setMinutes] = useState<number[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);

  useEffect(() => {
    if (!challenge || hasLoadedDraft) {
      return;
    }

    setFrequency(challenge.frequency);
    setMinutes(challenge.reminders.map((reminder) => reminder.minuteOfDay));
    setHasLoadedDraft(true);
  }, [challenge, hasLoadedDraft]);

  const save = useMutation({
    mutationFn: async () => {
      if (!challenge) {
        return;
      }

      await apiClient.setChallengeEnrollment({
        challengeId: challenge.challengeId,
        isEnrolled: true,
        frequency,
      });

      const existing = challenge.reminders;
      const keptMinutes = new Set(minutes);

      for (const reminder of existing) {
        if (!keptMinutes.has(reminder.minuteOfDay)) {
          await apiClient.removeChallengeReminder({
            reminderId: reminder.id,
          });
        }
      }

      const existingMinutes = new Set(
        existing.map((reminder) => reminder.minuteOfDay),
      );

      for (const minuteOfDay of minutes) {
        if (!existingMinutes.has(minuteOfDay)) {
          await apiClient.addChallengeReminder({
            challengeId: challenge.challengeId,
            minuteOfDay,
          });
        }
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['challenges', 'catalog'] }),
        queryClient.invalidateQueries({ queryKey: ['challenges', 'today'] }),
      ]);
      setHasLoadedDraft(false);
    },
  });

  const stopChallenge = useMutation({
    mutationFn: () =>
      apiClient.setChallengeEnrollment({
        challengeId,
        isEnrolled: false,
        frequency,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['challenges', 'catalog'] }),
        queryClient.invalidateQueries({ queryKey: ['challenges', 'today'] }),
      ]);
      router.back();
    },
  });


  if (catalogQuery.isPending) {
    return <ScreenLoader testID="challenge-detail-loading" />;
  }

  if (!challenge) {
    return (
      <View style={styles.centred} testID="challenge-detail-missing">
        <Text style={styles.missing}>This challenge is not in your catalog.</Text>
      </View>
    );
  }

  if (!hasLoadedDraft) {
    return <ScreenLoader testID="challenge-detail-loading" />;
  }

  const isDirty =
    frequency !== challenge.frequency ||
    !sameMinutes(
      minutes,
      challenge.reminders.map((reminder) => reminder.minuteOfDay),
    );
  const canAdd = minutes.length < maxRemindersPerChallenge;
  const isBusy = save.isPending || stopChallenge.isPending;
  const categoryName =
    healthCategories.find((item) => item.id === challenge.category)?.name ??
    challenge.category;
  const instruction = challenge.instruction || challenge.description;

  function handlePrimaryAction() {
    if (!occurrence) {
      return;
    }

    const route = completionRoute(occurrence);
    if (route) {
      router.push(route);
    }
  }

  const primaryLabel = primaryActionLabel(occurrence);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={styles.container}
      testID="challenge-detail-screen"
    >
      <View style={styles.heroRow}>
        <ChallengeIcon
          category={challenge.category}
          name={challenge.icon}
          size="md"
        />
        <Text style={styles.title}>{challenge.title}</Text>
        <Text style={styles.categoryBadge}>{categoryName}</Text>
      </View>
      <Text style={styles.meta}>
        {frequencyLabel[challenge.frequency]}
        <Text style={styles.metaDot}> · </Text>
        <Text style={styles.reward}>+{challenge.rewardPoints} pts</Text>
      </Text>

      <View style={styles.tabs} testID="challenge-detail-tabs">
        {CHALLENGE_DETAIL_TABS.map((option) => {
          const isSelected = option.id === tab;

          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              key={option.id}
              onPress={() => setTab(option.id)}
              style={styles.tab}
              testID={`challenge-detail-tab-${option.id}`}
            >
              <Text
                style={[
                  styles.tabLabel,
                  isSelected ? styles.tabLabelSelected : null,
                ]}
              >
                {option.label}
              </Text>
              <View
                style={[
                  styles.tabRule,
                  isSelected ? styles.tabRuleSelected : null,
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      {tab === 'history' ? (
        <ChallengeHistoryPanel
          entries={mergeTodayIntoHistory(
            historyQuery.data?.entries ?? [],
            occurrence,
          )}
          isError={historyQuery.isError}
          isPending={historyQuery.isPending}
        />
      ) : (
        <View style={styles.tabPage}>
      <Text style={styles.description}>{challenge.description}</Text>

      <Text style={styles.kicker}>What to do</Text>
      <View style={styles.block}>
        <Text style={styles.description}>{instruction}</Text>
      </View>

      {occurrence?.completionKind === 'vitals_bp' ? (
        <Text style={styles.hint}>
          At random intervals you may be asked to photograph your device
          screen showing the reading.
        </Text>
      ) : null}

      {occurrence?.completionKind === 'evidence_photo' ? (
        <Text style={styles.hint}>
          Take a selfie at the gym or during the workout.
        </Text>
      ) : null}

      {primaryLabel ? (
        <FormButton
          disabled={occurrence?.status === 'completed' || isBusy}
          label={primaryLabel}
          loading={isBusy}
          onPress={handlePrimaryAction}
          testID="challenge-detail-start"
        />
      ) : null}

      <Text style={styles.sectionTitle}>How often</Text>
      <View style={styles.frequencyRow}>
        {frequencyOptions.map((option) => {
          const isSelected = option === frequency;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={option}
              onPress={() => setFrequency(option)}
              style={[
                styles.frequencyPill,
                isSelected ? styles.frequencyPillSelected : null,
              ]}
              testID={`detail-frequency-${option}`}
            >
              <Text
                style={[
                  styles.frequencyText,
                  isSelected ? styles.frequencyTextSelected : null,
                ]}
              >
                {frequencyLabel[option]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Reminders</Text>
      <Text style={styles.hint}>
        Daily challenge reminders must be on in Profile for these to send.
      </Text>

      <View style={styles.reminderList}>
        {minutes
          .slice()
          .sort((left, right) => left - right)
          .map((minute) => (
            <View key={minute} style={styles.reminderRow}>
              <Text style={styles.reminderTime}>
                {formatReminderMinute(minute)}
              </Text>
              <Pressable
                accessibilityLabel={`Remove ${formatReminderMinute(minute)}`}
                accessibilityRole="button"
                onPress={() =>
                  setMinutes((current) =>
                    current.filter((item) => item !== minute),
                  )
                }
                testID={`detail-remove-reminder-${minute}`}
              >
                <Feather color={colors.muted} name="x" size={18} />
              </Pressable>
            </View>
          ))}

        {canAdd ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsPickerOpen(true)}
            style={styles.addRow}
            testID="detail-add-reminder"
          >
            <Feather color={colors.accent} name="plus" size={16} />
            <Text style={styles.addLabel}>Add a time</Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={!isDirty || isBusy}
        onPress={() => save.mutate()}
        style={[
          styles.saveButton,
          !isDirty || isBusy ? styles.saveButtonDisabled : null,
        ]}
        testID="challenge-detail-save"
      >
        {save.isPending ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <Text style={styles.saveLabel}>Save</Text>
        )}
      </Pressable>

      {challenge.isEnrolled ? (
        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={() => stopChallenge.mutate()}
          testID="challenge-detail-stop"
        >
          <Text style={styles.stopLabel}>Remove from my challenges</Text>
        </Pressable>
      ) : null}
        </View>
      )}

      <TimePickerModal
        initialMinute={minutes.at(-1) ?? defaultReminderMinute}
        onCancel={() => setIsPickerOpen(false)}
        onConfirm={(minuteOfDay) => {
          setMinutes((current) =>
            current.includes(minuteOfDay) ? current : [...current, minuteOfDay],
          );
          setIsPickerOpen(false);
        }}
        visible={isPickerOpen}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    flex: 1,
  },
  categoryBadge: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    backgroundColor: colors.accentSurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  meta: {
    color: colors.muted,
    fontSize: fontSize.sm,
  },
  metaDot: {
    color: colors.border,
  },
  kicker: {
    color: colors.muted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.xs,
  },
  block: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  tabs: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  tab: {
    paddingBottom: 4,
  },
  tabLabel: {
    color: colors.muted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  tabLabelSelected: {
    color: colors.accent,
  },
  tabRule: {
    height: 2,
    marginTop: 4,
    backgroundColor: 'transparent',
  },
  tabRuleSelected: {
    backgroundColor: colors.accent,
  },
  tabPage: {
    gap: spacing.md,
  },
  description: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  reward: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.sm,
  },
  hint: {
    color: colors.muted,
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  frequencyPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderColor: colors.border,
    borderWidth: 1,
  },
  frequencyPillSelected: {
    backgroundColor: colors.accentContainer,
    borderColor: colors.accent,
  },
  frequencyText: {
    color: colors.muted,
    fontSize: fontSize.sm,
  },
  frequencyTextSelected: {
    color: colors.accent,
    fontWeight: fontWeight.semibold,
  },
  reminderList: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reminderTime: {
    color: colors.text,
    fontSize: fontSize.sm,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  addLabel: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  saveButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    marginTop: spacing.sm,
  },
  saveButtonDisabled: {
    backgroundColor: colors.disabledSurface,
  },
  saveLabel: {
    color: colors.onAccent,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  historyList: {
    marginHorizontal: -spacing.lg,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  historyBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  historySummary: {
    color: colors.text,
    fontSize: fontSize.sm,
  },
  historyMeta: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
  historyDelta: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  historyDeltaPenalty: {
    color: colors.danger,
  },
  historyDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  historyEmpty: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  stopLabel: {
    color: colors.danger,
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  missing: {
    color: colors.muted,
    textAlign: 'center',
  },
});
