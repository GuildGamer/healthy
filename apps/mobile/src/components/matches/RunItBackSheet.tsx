import type { MatchBoard } from '@product/client';
import { spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import {
  DeckButton,
  DeckSheetMessage,
  DeckSheetModal,
  DeckSheetSub,
} from '@/components/deck';
import { type Theme, useThemedStyles } from '@/theme';
import { GroupCard } from './GroupCard';
import { GroupFaceStack, stackFacesFrom } from './GroupFaceStack';
import { groupKindLabel, groupRuleTitle } from './group-rule-copy';
import { contestDays } from './group-rerun';
import { displayNameFor } from './group-today';
import { RESULT_COPY } from './match-copy';

interface RunItBackSheetProps {
  board: MatchBoard;
  visible: boolean;
  isBusy: boolean;
  hasFailed: boolean;
  onStart: () => void;
  onChange: () => void;
  onClose: () => void;
}

function sameAgainLine(board: MatchBoard): string {
  const days = contestDays(board);
  const length = days === 1 ? 'one-day' : `${days}-day`;
  return `A new ${length} ${groupKindLabel(board).toLowerCase()} with the same ${board.participantCount} people.`;
}

/** What will be the same: rules, length and people. Change opens the start screen filled in. */
export function RunItBackSheet({
  board,
  visible,
  isBusy,
  hasFailed,
  onStart,
  onChange,
  onClose,
}: RunItBackSheetProps) {
  const styles = useThemedStyles(createStyles);
  const days = contestDays(board);

  return (
    <DeckSheetModal
      footer={
        <View style={styles.actions}>
          <DeckButton
            label={RESULT_COPY.startIt}
            loading={isBusy}
            onPress={onStart}
            testID="match-rerun-start"
          />
          <DeckButton
            disabled={isBusy}
            label={RESULT_COPY.changeSomething}
            onPress={onChange}
            testID="match-rerun-change"
            variant="quiet"
          />
        </View>
      }
      onDismiss={isBusy ? undefined : onClose}
      testID="match-rerun-sheet"
      title={RESULT_COPY.sameAgain}
      visible={visible}
    >
      <DeckSheetSub>{sameAgainLine(board)}</DeckSheetSub>
      <GroupCard
        corner={days === 1 ? '1 day' : `${days} days`}
        rules={board}
        size="rule"
        title={groupRuleTitle(board)}
      >
        <View style={styles.people}>
          <GroupFaceStack
            faces={stackFacesFrom(board.standings).map((face) => ({ ...face, look: 'lit' }))}
          />
          <Text numberOfLines={1} style={styles.names}>
            {board.standings.map(displayNameFor).join(', ')}
          </Text>
        </View>
      </GroupCard>
      {hasFailed ? <DeckSheetMessage message={RESULT_COPY.runItBackFailed} /> : null}
    </DeckSheetModal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    people: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 14,
    },
    names: {
      flex: 1,
      color: theme.deckCards.subtext,
      fontSize: 14,
    },
    actions: {
      marginTop: 18,
      gap: spacing.xs,
    },
  });
