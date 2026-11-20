import type { TodayChallenge } from '@product/client';
import { spacing } from '@product/brand';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  DeckButton,
  DeckSheet,
  DeckSheetEyebrow,
  DeckSheetMessage,
  DeckSheetSub,
} from '@/components/deck';
import { goBackOrHome } from '@/lib/go-back';
import { SAVE_RETRY_LABEL } from './constants/doing-copy';
import { useChallengeTone } from './useChallengeTone';

interface ReadingSheetLayoutProps {
  occurrence: TodayChallenge;
  label: string;
  corner: string;
  /** The range, or why the save failed; numbers stay put either way. */
  message: string | null;
  saveLabel: string;
  canSave: boolean;
  isSaving: boolean;
  /** The last save failed, so the button offers to try again. */
  didFail: boolean;
  onSave: () => void;
  children: ReactNode;
  testID: string;
}

/** Every reading sheet: the card's tone on top, the reading, one line if needed, and save. */
export function ReadingSheetLayout({
  occurrence,
  label,
  corner,
  message,
  saveLabel,
  canSave,
  isSaving,
  didFail,
  onSave,
  children,
  testID,
}: ReadingSheetLayoutProps) {
  const { tone, glyph } = useChallengeTone(occurrence);

  return (
    <DeckSheet
      footer={
        <View style={styles.save}>
          <DeckButton
            disabled={!canSave}
            label={didFail ? SAVE_RETRY_LABEL : saveLabel}
            loading={isSaving}
            onPress={onSave}
            testID="reading-save"
          />
        </View>
      }
      onDismiss={isSaving ? undefined : () => goBackOrHome()}
      testID={testID}
    >
      <DeckSheetEyebrow corner={corner} glyph={glyph} label={label} tone={tone} />
      {children}
      {message ? <DeckSheetMessage message={message} testID="reading-message" /> : null}
    </DeckSheet>
  );
}

/** The sheet when there is nothing to log: not on today's list, or already logged. */
export function ClosedReadingSheet({ message, testID }: { message: string; testID: string }) {
  return (
    <DeckSheet
      footer={
        <View style={styles.save}>
          <DeckButton label="OK" onPress={() => goBackOrHome()} variant="tonal" />
        </View>
      }
      onDismiss={() => goBackOrHome()}
      testID={testID}
    >
      <DeckSheetSub>{message}</DeckSheetSub>
    </DeckSheet>
  );
}

const styles = StyleSheet.create({
  save: {
    marginTop: spacing.md - 2,
  },
});
