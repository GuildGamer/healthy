import type { CatalogChallenge, ChallengeFrequency } from '@product/client';
import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { displayChallengeTitle } from '@product/contract/challenge-title';
import { useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  DeckButton,
  DeckSegmented,
  DeckSheetFooter,
  DeckSheetMessage,
  DeckSheetModal,
} from '@/components/deck';
import { Glyph } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { membershipBoxBody, rewardCornerLabel } from './catalog-layout';
import { challengeGoal, goalLabel } from './challenge-goal';
import { challengeProof } from './challenge-proof';
import { ChallengeHero } from './ChallengeHero';
import { frequencyLabel, frequencyOptions } from './constants/frequency-labels';
import { MOMENT_HINT } from './constants/reminder-moments';
import { CATALOG_COPY } from './constants/routine-copy';
import { GoalPicker } from './GoalPicker';
import { ReminderMomentPicker } from './ReminderMomentPicker';
import { reminderLabel, suggestedMoment } from './reminder-moments';
import { SettingRow } from './SettingRow';
import { useAddChallenge } from './useChallengeMutations';

type PreviewStep = 'preview' | 'reminder' | 'goal';

const FREQUENCY_SEGMENTS = frequencyOptions.map((id) => ({ id, label: frequencyLabel[id] }));

interface ChallengePreviewSheetProps {
  challenge: CatalogChallenge | null;
  /** How many other challenges membership opens, for a locked one's box. */
  otherMembersOnlyCount: number;
  onClose: () => void;
  onAdded: (frequency: ChallengeFrequency) => void;
}

/** The one moment someone is curious about a challenge: what you do, how it counts, and when. */
export function ChallengePreviewSheet({
  challenge,
  otherMembersOnlyCount,
  onClose,
  onAdded,
}: ChallengePreviewSheetProps) {
  return (
    <DeckSheetModal onDismiss={onClose} testID="catalog-preview" visible={challenge !== null}>
      {challenge ? (
        <PreviewBody
          challenge={challenge}
          key={challenge.challengeId}
          onAdded={onAdded}
          onClose={onClose}
          otherMembersOnlyCount={otherMembersOnlyCount}
        />
      ) : null}
    </DeckSheetModal>
  );
}

function PreviewBody({
  challenge,
  otherMembersOnlyCount,
  onClose,
  onAdded,
}: ChallengePreviewSheetProps & { challenge: CatalogChallenge }) {
  const goal = challengeGoal(challenge);
  const moment = suggestedMoment(challenge);
  const [step, setStep] = useState<PreviewStep>('preview');
  const [frequency, setFrequency] = useState(challenge.frequency);
  const [goalAmount, setGoalAmount] = useState(goal?.amount ?? null);
  const [reminderMinute, setReminderMinute] = useState(moment.minuteOfDay);
  const addChallenge = useAddChallenge();

  if (step === 'reminder') {
    return (
      <ReminderMomentPicker
        hint={MOMENT_HINT[moment.id]}
        initialMinute={reminderMinute}
        onSave={(minuteOfDay) => {
          setReminderMinute(minuteOfDay);
          setStep('preview');
        }}
      />
    );
  }

  if (step === 'goal' && goal?.editor && goalAmount !== null) {
    return (
      <GoalPicker
        editor={goal.editor}
        initialValue={goalAmount}
        onDone={(amount) => {
          setGoalAmount(amount);
          setStep('preview');
        }}
        unit={goal.unit}
      />
    );
  }

  function add() {
    addChallenge.mutate(
      {
        challengeId: challenge.challengeId,
        frequency,
        goal:
          goal && goalAmount !== null && goalAmount !== goal.amount
            ? { field: goal.field, amount: goalAmount }
            : null,
        reminderMinute,
      },
      { onSuccess: () => onAdded(frequency) },
    );
  }

  return (
    <PreviewCard challenge={challenge} frequency={frequency} goalAmount={goalAmount}>
      {challenge.isLocked ? (
        <MembersOnlyOffer onClose={onClose} otherCount={otherMembersOnlyCount} />
      ) : (
        <PreviewSettings
          frequency={frequency}
          goalValue={
            goal && goalAmount !== null ? goalLabel({ ...goal, amount: goalAmount }) : null
          }
          hasFailed={addChallenge.isError}
          isAdding={addChallenge.isPending}
          onAdd={add}
          onEditGoal={goal?.editor ? () => setStep('goal') : null}
          onEditReminder={() => setStep('reminder')}
          onSelectFrequency={setFrequency}
          reminderMinute={reminderMinute}
        />
      )}
    </PreviewCard>
  );
}

function PreviewSettings({
  frequency,
  goalValue,
  reminderMinute,
  isAdding,
  hasFailed,
  onSelectFrequency,
  onEditGoal,
  onEditReminder,
  onAdd,
}: {
  frequency: ChallengeFrequency;
  goalValue: string | null;
  reminderMinute: number;
  isAdding: boolean;
  hasFailed: boolean;
  onSelectFrequency: (frequency: ChallengeFrequency) => void;
  onEditGoal: (() => void) | null;
  onEditReminder: () => void;
  onAdd: () => void;
}) {
  return (
    <>
      <View style={styles.settings}>
        <SettingRow
          control={
            <DeckSegmented
              isCompact
              onSelect={onSelectFrequency}
              options={FREQUENCY_SEGMENTS}
              selected={frequency}
              testID="preview-frequency"
            />
          }
          isFirst
          label={CATALOG_COPY.howOften}
        />
        {goalValue ? (
          <SettingRow
            label={CATALOG_COPY.goal}
            onPress={onEditGoal ?? undefined}
            testID="preview-goal"
            value={goalValue}
          />
        ) : null}
        <SettingRow
          label={CATALOG_COPY.reminder}
          onPress={onEditReminder}
          testID="preview-reminder"
          value={reminderLabel(reminderMinute)}
        />
      </View>
      {hasFailed ? <DeckSheetMessage message={CATALOG_COPY.addFailed} /> : null}
      <DeckSheetFooter>
        <View style={styles.action}>
          <DeckButton
            label={CATALOG_COPY.addButton}
            loading={isAdding}
            onPress={onAdd}
            testID="preview-add"
          />
        </View>
      </DeckSheetFooter>
    </>
  );
}

function PreviewCard({
  challenge,
  frequency,
  goalAmount,
  children,
}: {
  challenge: CatalogChallenge;
  frequency: ChallengeFrequency;
  goalAmount: number | null;
  children: ReactNode;
}) {
  const themed = useThemedStyles(createStyles);
  const proof = challengeProof(challenge);
  const title = displayChallengeTitle({
    title: challenge.title,
    metric: challenge.capture.metric,
    count: goalAmount ?? challenge.capture.target.count,
  });

  return (
    <View>
      <ChallengeHero
        challenge={challenge}
        corner={rewardCornerLabel(challenge.rewardPoints, frequency)}
        proof={{ glyph: proof.glyph, line: proof.sentence }}
        title={title}
      />
      <Text style={themed.description}>{challenge.description}</Text>
      {children}
    </View>
  );
}

function MembersOnlyOffer({ otherCount, onClose }: { otherCount: number; onClose: () => void }) {
  const router = useRouter();
  const { colors } = useTheme();
  const themed = useThemedStyles(createStyles);

  return (
    <>
      <View style={themed.memberBox} testID="preview-members-box">
        <View style={themed.memberTitleRow}>
          <Glyph color={colors.text} name="spark" size={14} strokeWidth={2} />
          <Text style={themed.memberTitle}>{CATALOG_COPY.membershipBoxTitle}</Text>
        </View>
        <Text style={themed.memberBody}>{membershipBoxBody(otherCount)}</Text>
      </View>
      <DeckSheetFooter>
        <View style={styles.action}>
          <DeckButton
            label={CATALOG_COPY.membershipButton}
            onPress={() => {
              onClose();
              router.push({ pathname: '/membership', params: { source: 'other' } });
            }}
            testID="preview-membership"
          />
        </View>
      </DeckSheetFooter>
    </>
  );
}

const styles = StyleSheet.create({
  settings: {
    marginTop: spacing.sm,
  },
  action: {
    marginTop: 18,
  },
});

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    description: {
      color: theme.colors.text,
      fontSize: 15,
      lineHeight: 22,
      marginTop: spacing.md,
    },
    memberBox: {
      marginTop: spacing.md,
      paddingVertical: 14,
      paddingHorizontal: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: theme.colors.surfaceRaised,
    },
    memberTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 2,
    },
    memberTitle: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: fontWeight.semibold,
    },
    memberBody: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      lineHeight: 20,
    },
  });
