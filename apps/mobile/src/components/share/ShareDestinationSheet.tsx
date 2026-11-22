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
  showChallenge?: boolean;
  showClip?: boolean;
  title?: string;
  testID?: string;
};

/**
 * Destinations for chrome that cannot host a permanent row: board share link,
 * post-create invite handoffs, and similar.
 */
export function ShareDestinationSheet({
  visible,
  payload,
  onClose,
  onChallenge,
  showChallenge = false,
  showClip = false,
  title = SHARE_DEST_COPY.sheetTitle,
  testID = 'share-destination-sheet',
}: ShareDestinationSheetProps) {
  const styles = useThemedStyles(createStyles);

  async function onSelect(id: ShareDestinationSelectId) {
    if (id === 'challenge') {
      onChallenge?.();
      onClose();
      return;
    }

    await openShareDestination(id as ShareDestinationId, payload);
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
          showClip={showClip}
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
