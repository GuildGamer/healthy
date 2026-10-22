import type { MatchBoard, MatchStanding } from '@product/client';
import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { matchNudgePush } from '@product/contract/match-board';
import { StyleSheet, Text, View } from 'react-native';
import {
  DeckButton,
  DeckSheetMessage,
  DeckSheetModal,
  DeckSheetSub,
  DeckSheetTitle,
} from '@/components/deck';
import { Glyph } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { GroupFace } from './GroupFace';
import { notDoneYetLine } from './group-rule-copy';
import { BOARD_COPY } from './match-copy';

const NUDGE_FACE_SIZE = 52;

interface NudgeSheetProps {
  match: MatchBoard;
  target: MatchStanding | null;
  senderName: string;
  isSending: boolean;
  hasFailed: boolean;
  onSend: () => void;
  onClose: () => void;
}

/** Shows the exact push the other person will get, so a nudge is never a surprise. */
export function NudgeSheet({
  match,
  target,
  senderName,
  isSending,
  hasFailed,
  onSend,
  onClose,
}: NudgeSheetProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const push = matchNudgePush({ ...match, senderName });

  return (
    <DeckSheetModal
      onDismiss={isSending ? undefined : onClose}
      testID="match-nudge-sheet"
      visible={target !== null}
    >
      {target ? (
        <>
          <View style={styles.head}>
            <GroupFace
              image={target.image}
              look="off"
              name={target.displayName}
              size={NUDGE_FACE_SIZE}
              userId={target.userId}
            />
            <View style={styles.headText}>
              <DeckSheetTitle>{BOARD_COPY.nudgeTitle(target.displayName)}</DeckSheetTitle>
              <Text style={styles.reason}>{notDoneYetLine(match, target.displayName)}</Text>
            </View>
          </View>
          <View style={styles.preview} testID="match-nudge-preview">
            <Glyph color={colors.muted} name="bell" size={16} strokeWidth={2} />
            <View style={styles.previewText}>
              <Text style={styles.app}>{BOARD_COPY.pushApp}</Text>
              <Text style={styles.pushTitle}>{push.title}</Text>
              <Text style={styles.pushBody}>{push.body}</Text>
            </View>
          </View>
          <DeckSheetSub>{BOARD_COPY.nudgeNote(target.displayName)}</DeckSheetSub>
          {hasFailed ? <DeckSheetMessage message={BOARD_COPY.reactionFailed} /> : null}
          <View style={styles.action}>
            <DeckButton
              label={BOARD_COPY.nudgeSend}
              loading={isSending}
              onPress={onSend}
              testID="match-nudge-send"
            />
          </View>
        </>
      ) : null}
    </DeckSheetModal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    headText: {
      flex: 1,
    },
    reason: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      marginTop: 2,
    },
    preview: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginTop: 18,
      padding: 14,
      borderRadius: radii.lg,
      backgroundColor: theme.colors.surfaceRaised,
    },
    previewText: {
      flex: 1,
    },
    app: {
      color: theme.colors.muted,
      fontSize: fontSize.xs,
    },
    pushTitle: {
      color: theme.colors.text,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      marginTop: 2,
    },
    pushBody: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      lineHeight: 20,
    },
    action: {
      marginTop: spacing.md,
    },
  });
