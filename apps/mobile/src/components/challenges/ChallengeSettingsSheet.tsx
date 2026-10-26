import type { CatalogChallenge, ChallengeReminder } from '@product/client';
import { spacing } from '@product/brand';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import {
  DeckButton,
  DeckSheetFooter,
  DeckSheetModal,
  DeckSheetSub,
  DeckSheetTitle,
} from '@/components/deck';
import { challengeGoal, goalPatch } from './challenge-goal';
import { MOMENT_HINT } from './constants/reminder-moments';
import { SETTINGS_COPY } from './constants/routine-copy';
import { GoalPicker } from './GoalPicker';
import { ReminderMomentPicker } from './ReminderMomentPicker';
import { suggestedMoment } from './reminder-moments';
import type { SettingsSheet } from './types/settings-sheet';
import { useSaveReminder, useUpdateEnrollment } from './useChallengeMutations';

interface ChallengeSettingsSheetProps {
  sheet: SettingsSheet | null;
  challenge: CatalogChallenge;
  reminderLimit: number;
  onClose: () => void;
}

/** The sheet a setting opens: the goal, a reminder time, or why there is only one reminder. */
export function ChallengeSettingsSheet({
  sheet,
  challenge,
  reminderLimit,
  onClose,
}: ChallengeSettingsSheetProps) {
  return (
    <DeckSheetModal onDismiss={onClose} testID="settings-sheet" visible={sheet !== null}>
      {sheet?.kind === 'goal' ? <GoalSheetBody challenge={challenge} onClose={onClose} /> : null}
      {sheet?.kind === 'reminder' ? (
        <ReminderSheetBody challenge={challenge} onClose={onClose} replacing={sheet.replacing} />
      ) : null}
      {sheet?.kind === 'moreReminders' ? (
        <MoreRemindersBody limit={reminderLimit} onClose={onClose} />
      ) : null}
    </DeckSheetModal>
  );
}

function GoalSheetBody({
  challenge,
  onClose,
}: {
  challenge: CatalogChallenge;
  onClose: () => void;
}) {
  const updateEnrollment = useUpdateEnrollment();
  const goal = challengeGoal(challenge);
  if (!goal?.editor) {
    return null;
  }

  return (
    <GoalPicker
      editor={goal.editor}
      error={updateEnrollment.isError ? SETTINGS_COPY.saveFailed : null}
      initialValue={goal.amount}
      isSaving={updateEnrollment.isPending}
      onDone={(amount) =>
        updateEnrollment.mutate(
          { challengeId: challenge.challengeId, ...goalPatch(goal.field, amount) },
          { onSuccess: onClose },
        )
      }
      unit={goal.unit}
    />
  );
}

function ReminderSheetBody({
  challenge,
  replacing,
  onClose,
}: {
  challenge: CatalogChallenge;
  replacing: ChallengeReminder | null;
  onClose: () => void;
}) {
  const saveReminder = useSaveReminder();
  const moment = suggestedMoment(challenge);

  return (
    <ReminderMomentPicker
      error={saveReminder.isError ? SETTINGS_COPY.saveFailed : null}
      hint={MOMENT_HINT[moment.id]}
      initialMinute={replacing?.minuteOfDay ?? moment.minuteOfDay}
      isSaving={saveReminder.isPending}
      onSave={(minuteOfDay) =>
        saveReminder.mutate(
          { challengeId: challenge.challengeId, minuteOfDay, replacing },
          { onSuccess: onClose },
        )
      }
    />
  );
}

function MoreRemindersBody({ limit, onClose }: { limit: number; onClose: () => void }) {
  const router = useRouter();
  const title =
    limit === 1
      ? 'One reminder per challenge, for now.'
      : `${limit} reminders per challenge, for now.`;

  return (
    <View testID="more-reminders">
      <DeckSheetTitle>{title}</DeckSheetTitle>
      <DeckSheetSub>{SETTINGS_COPY.moreRemindersBody}</DeckSheetSub>
      <DeckSheetFooter>
        <View style={styles.actions}>
          <DeckButton
            label={SETTINGS_COPY.moreRemindersMembership}
            onPress={() => {
              onClose();
              router.push({ pathname: '/membership', params: { source: 'other' } });
            }}
            testID="more-reminders-membership"
          />
          <DeckButton label={SETTINGS_COPY.notNow} onPress={onClose} variant="quiet" />
        </View>
      </DeckSheetFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
});
