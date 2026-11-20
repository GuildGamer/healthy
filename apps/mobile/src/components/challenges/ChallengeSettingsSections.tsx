import type { CatalogChallenge, ChallengeFrequency, ChallengeReminder } from '@product/client';
import { StyleSheet, View } from 'react-native';
import { DeckSegmented } from '@/components/deck';
import { challengeGoal, goalLabel } from './challenge-goal';
import { challengeProof } from './challenge-proof';
import { frequencyLabel, frequencyOptions } from './constants/frequency-labels';
import { SETTINGS_COPY } from './constants/routine-copy';
import { ListSectionTitle } from './ListSectionTitle';
import { reminderLabel } from './reminder-moments';
import { SettingRow } from './SettingRow';

const FREQUENCY_SEGMENTS = frequencyOptions.map((id) => ({ id, label: frequencyLabel[id] }));

/** How often, the goal, and how it counts. Each change saves on its own. */
export function ScheduleSettings({
  challenge,
  frequency,
  isSaving,
  onSelectFrequency,
  onEditGoal,
}: {
  challenge: CatalogChallenge;
  frequency: ChallengeFrequency;
  isSaving: boolean;
  onSelectFrequency: (frequency: ChallengeFrequency) => void;
  onEditGoal: () => void;
}) {
  const goal = challengeGoal(challenge);

  return (
    <View testID="challenge-settings">
      <ListSectionTitle label={SETTINGS_COPY.settingsTitle} />
      <SettingRow
        control={
          <DeckSegmented
            disabled={isSaving}
            isCompact
            onSelect={onSelectFrequency}
            options={FREQUENCY_SEGMENTS}
            selected={frequency}
            testID="detail-frequency"
          />
        }
        isFirst
        label={SETTINGS_COPY.howOften}
      />
      {goal ? (
        <SettingRow
          label={SETTINGS_COPY.goal}
          onPress={goal.editor ? onEditGoal : undefined}
          testID="detail-goal"
          value={goalLabel(goal)}
        />
      ) : null}
      <SettingRow label={SETTINGS_COPY.measuredBy} value={challengeProof(challenge).by} />
    </View>
  );
}

type ReminderSettingsProps = {
  reminders: readonly ChallengeReminder[];
  /** Reminders this member may set on one challenge. */
  limit: number;
  hasMembership: boolean;
  historyCount: string | null;
  onEditReminder: (reminder: ChallengeReminder | null) => void;
  onRemoveReminder: (reminder: ChallengeReminder) => void;
  onAskForMore: () => void;
  onOpenHistory: () => void;
};

/** The times it nudges you, a way to add one, and the way into its history. */
export function ReminderSettings({
  reminders,
  limit,
  hasMembership,
  historyCount,
  onEditReminder,
  onRemoveReminder,
  onAskForMore,
  onOpenHistory,
}: ReminderSettingsProps) {
  const sorted = [...reminders].sort((left, right) => left.minuteOfDay - right.minuteOfDay);
  const canAdd = sorted.length < limit;
  const addLabel =
    sorted.length === 0 ? SETTINGS_COPY.addReminder : SETTINGS_COPY.addAnotherReminder;

  return (
    <View testID="challenge-reminders">
      <ListSectionTitle label={SETTINGS_COPY.remindersTitle} />
      {sorted.map((reminder, index) => (
        <SettingRow
          glyph="bell"
          isFirst={index === 0}
          key={reminder.id}
          label={reminderLabel(reminder.minuteOfDay)}
          onPress={() => onEditReminder(reminder)}
          testID={`detail-reminder-${reminder.minuteOfDay}`}
          trailing={{
            glyph: 'close',
            accessibilityLabel: `Remove ${reminderLabel(reminder.minuteOfDay)}`,
            onPress: () => onRemoveReminder(reminder),
            testID: `detail-remove-reminder-${reminder.minuteOfDay}`,
          }}
        />
      ))}
      {canAdd || !hasMembership ? (
        <SettingRow
          glyph="plus"
          isFirst={sorted.length === 0}
          isMuted
          label={addLabel}
          onPress={canAdd ? () => onEditReminder(null) : onAskForMore}
          tag={canAdd ? null : SETTINGS_COPY.membersTag}
          testID={canAdd ? 'detail-add-reminder' : 'detail-unlock-reminders'}
        />
      ) : null}
      <View style={styles.history}>
        <SettingRow
          isFirst
          label={SETTINGS_COPY.history}
          onPress={onOpenHistory}
          testID="detail-history"
          value={historyCount}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  history: {
    marginTop: 6,
  },
});
