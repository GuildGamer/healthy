import type { TodayChallenge } from '@product/client';
import { spacing } from '@product/brand';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  DeckButton,
  DeckSheet,
  DeckSheetEyebrow,
  DeckSheetMessage,
  DeckSheetSub,
  DeckSheetTitle,
} from '@/components/deck';
import { healthCategoryName } from '@/constants/health-categories';
import { goBackOrHome } from '@/lib/go-back';
import { NOT_ON_TODAY, READING_COPY, SAVE_RETRY_LABEL } from './constants/doing-copy';
import { finishAndLeave } from './finish-challenge';
import { ClosedReadingSheet } from './ReadingSheetLayout';
import { saveFailedMessage } from './save-error';
import { useChallengeTone } from './useChallengeTone';
import { useCompleteChallenge } from './useCompleteChallenge';
import { useTodayOccurrence } from './useTodayOccurrence';

/**
 * A check-in opened from anywhere but its card. On Today the card's own
 * button marks it done; this sheet is the same act for the list and detail.
 */
export function ChallengeConfirmScreen({ challengeId }: { challengeId: string }) {
  const { occurrence, isPending } = useTodayOccurrence(challengeId);

  if (isPending) {
    return null;
  }

  if (!occurrence || occurrence.status === 'completed') {
    return <ClosedReadingSheet message={NOT_ON_TODAY} testID="confirm-closed" />;
  }

  return <CheckInSheet occurrence={occurrence} />;
}

function CheckInSheet({ occurrence }: { occurrence: TodayChallenge }) {
  const { tone, glyph } = useChallengeTone(occurrence);
  const [saveError, setSaveError] = useState<string | null>(null);
  const complete = useCompleteChallenge();

  function markDone() {
    setSaveError(null);
    complete.mutate(
      { occurrence, payload: {} },
      {
        onSuccess: (result) => finishAndLeave(result, { kind: 'checkedIn' }),
        onError: (error) => setSaveError(saveFailedMessage(error)),
      },
    );
  }

  return (
    <DeckSheet
      onDismiss={complete.isPending ? undefined : () => goBackOrHome()}
      testID="confirm-sheet"
    >
      <DeckSheetEyebrow glyph={glyph} label={healthCategoryName(occurrence.category)} tone={tone} />
      <DeckSheetTitle>{occurrence.title}</DeckSheetTitle>
      {occurrence.instruction ? <DeckSheetSub>{occurrence.instruction}</DeckSheetSub> : null}
      {saveError ? <DeckSheetMessage message={saveError} /> : null}
      <View style={styles.action}>
        <DeckButton
          label={complete.isError ? SAVE_RETRY_LABEL : READING_COPY.checkInDone}
          loading={complete.isPending}
          onPress={markDone}
          testID="confirm-challenge"
        />
      </View>
    </DeckSheet>
  );
}

const styles = StyleSheet.create({
  action: {
    marginTop: spacing.lg,
  },
});
