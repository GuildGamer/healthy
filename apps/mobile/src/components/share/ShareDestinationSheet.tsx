import { fontSize, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { DeckSheetModal } from '@/components/deck';
import {
  openShareDestination,
  type ShareDestinationId,
  type SharePayload,
} from '@/components/matches/share-destination';
import { type Theme, useThemedStyles } from '@/theme';
import { SHARE_DEST_COPY } from './constants/share-copy';
import { ShareDestinationRow, type ShareDestinationSelectId } from './ShareDestinationRow';

type ShareDestinationSheetProps = {
  visible: boolean;
  payload: SharePayload;
  onClose: () => void;
  /** After a destination opens (or Challenge is chosen). */
  onChallenge?: () => void;
  /** Fired after a social destination opens (not Challenge). */
  onShared?: (id: ShareDestinationId) => void;
  showChallenge?: boolean;
  /** Override invite-based Copy visibility. */
  showCopy?: boolean;
  title?: string;
  testID?: string;
};

/**
 * Destinations behind a single Share action: finish/share screens, board
 * invite handoffs, and similar.
 */
export function ShareDestinationSheet({
  visible,
  payload,
  onClose,
  onChallenge,
  onShared,
  showChallenge = false,
  showCopy,
  title = SHARE_DEST_COPY.sheetTitle,
  testID = 'share-destination-sheet',
}: ShareDestinationSheetProps) {
  const styles = useThemedStyles(createStyles);
  const copyVisible =
    showCopy === undefined ? Boolean(payload.inviteUrl?.trim()) : showCopy;

  async function onSelect(id: ShareDestinationSelectId) {
    if (id === 'challenge') {
      onChallenge?.();
      onClose();
      return;
    }

    await openShareDestination(id as ShareDestinationId, payload);
    onShared?.(id as ShareDestinationId);
    onClose();
  }

  return (
    <DeckSheetModal onDismiss={onClose} testID={testID} title={title} visible={visible}>
      <View style={styles.body}>
        {payload.caption.trim().length > 0 ? (
          <Text numberOfLines={3} style={styles.caption} testID={`${testID}-caption`}>
            {payload.caption}
          </Text>
        ) : null}
        <ShareDestinationRow
          onSelect={(id) => void onSelect(id)}
          showChallenge={showChallenge}
          showCopy={copyVisible}
        />
      </View>
    </DeckSheetModal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    body: {
      gap: spacing.md,
      paddingBottom: spacing.sm,
    },
    caption: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      lineHeight: 20,
    },
  });
