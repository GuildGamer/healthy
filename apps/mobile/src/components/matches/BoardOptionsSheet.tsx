import { DeckChoiceSheet, type DeckChoiceAction } from '@/components/deck';
import { BOARD_COPY } from './match-copy';

interface BoardOptionsSheetProps {
  visible: boolean;
  isHost: boolean;
  canShare: boolean;
  onShare: () => void;
  onVerifyClip?: () => void;
  /** Cancel for the host, Leave for everyone else. */
  onStepAway: () => void;
  onClose: () => void;
}

/** Share link, and the one way out: the host cancels, a member leaves. */
export function BoardOptionsSheet({
  visible,
  isHost,
  canShare,
  onShare,
  onVerifyClip,
  onStepAway,
  onClose,
}: BoardOptionsSheetProps) {
  const actions: DeckChoiceAction[] = [];

  if (canShare) {
    actions.push({
      label: BOARD_COPY.shareLink,
      onPress: onShare,
      testID: 'match-options-share',
    });
  }

  if (onVerifyClip) {
    actions.push({
      label: 'Verify a clip',
      onPress: onVerifyClip,
      testID: 'match-options-verify',
    });
  }

  actions.push({
    label: isHost ? BOARD_COPY.cancelGroup : BOARD_COPY.leaveGroup,
    onPress: onStepAway,
    testID: isHost ? 'match-cancel' : 'match-leave',
    isDanger: true,
  });

  return (
    <DeckChoiceSheet
      actions={actions}
      closeLabel={BOARD_COPY.close}
      closeTestID="match-options-close"
      onClose={onClose}
      testID="match-options-sheet"
      visible={visible}
    />
  );
}
