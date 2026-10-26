import type { CatalogChallenge } from '@product/client';
import { spacing } from '@product/brand';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import {
  DeckButton,
  DeckSheetEyebrow,
  DeckSheetFooter,
  DeckSheetMessage,
  DeckSheetModal,
  DeckSheetSub,
  DeckSheetTitle,
} from '@/components/deck';
import { ROUTINE_COPY, SETTINGS_COPY } from './constants/routine-copy';
import { useRemoveChallenge } from './useChallengeMutations';
import { useChallengeTone } from './useChallengeTone';

/** Why a challenge stopped showing on Today, and the two ways on: membership, or letting it go. */
export function PausedChallengeSheet({
  challenge,
  onClose,
}: {
  challenge: CatalogChallenge | null;
  onClose: () => void;
}) {
  return (
    <DeckSheetModal onDismiss={onClose} testID="paused-sheet" visible={challenge !== null}>
      {challenge ? <PausedSheetBody challenge={challenge} onClose={onClose} /> : null}
    </DeckSheetModal>
  );
}

function PausedSheetBody({
  challenge,
  onClose,
}: {
  challenge: CatalogChallenge;
  onClose: () => void;
}) {
  const router = useRouter();
  const { tone, glyph } = useChallengeTone(challenge);
  const removeChallenge = useRemoveChallenge();

  function openMembership() {
    onClose();
    router.push({ pathname: '/membership', params: { source: 'other' } });
  }

  return (
    <>
      <DeckSheetEyebrow glyph={glyph} label={challenge.title} tone={tone} />
      <DeckSheetTitle>{ROUTINE_COPY.pausedSheetTitle}</DeckSheetTitle>
      <DeckSheetSub>{ROUTINE_COPY.pausedSheetBody}</DeckSheetSub>
      {removeChallenge.isError ? <DeckSheetMessage message={SETTINGS_COPY.saveFailed} /> : null}
      <DeckSheetFooter>
        <View style={styles.actions}>
          <DeckButton
            label={ROUTINE_COPY.pausedSheetMembership}
            onPress={openMembership}
            testID="paused-membership"
          />
          <DeckButton
            label={ROUTINE_COPY.pausedSheetRemove}
            loading={removeChallenge.isPending}
            onPress={() =>
              removeChallenge.mutate(challenge.challengeId, { onSuccess: () => onClose() })
            }
            testID="paused-remove"
            variant="quiet"
          />
        </View>
      </DeckSheetFooter>
    </>
  );
}

const styles = StyleSheet.create({
  actions: {
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
});
