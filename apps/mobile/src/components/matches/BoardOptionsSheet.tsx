import { fontWeight, radii, spacing } from '@product/brand';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DeckSheetModal } from '@/components/deck';
import { type Theme, useThemedStyles } from '@/theme';
import { BOARD_COPY } from './match-copy';

interface BoardOptionsSheetProps {
  visible: boolean;
  isHost: boolean;
  canShare: boolean;
  onShare: () => void;
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
  onStepAway,
  onClose,
}: BoardOptionsSheetProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <DeckSheetModal onDismiss={onClose} testID="match-options-sheet" visible={visible}>
      <View style={styles.group}>
        {canShare ? (
          <OptionRow label={BOARD_COPY.shareLink} onPress={onShare} testID="match-options-share" />
        ) : null}
        <OptionRow
          isDanger
          label={isHost ? BOARD_COPY.cancelGroup : BOARD_COPY.leaveGroup}
          onPress={onStepAway}
          testID={isHost ? 'match-cancel' : 'match-leave'}
        />
      </View>
      <View style={[styles.group, styles.closeGroup]}>
        <OptionRow isBold label={BOARD_COPY.close} onPress={onClose} testID="match-options-close" />
      </View>
    </DeckSheetModal>
  );
}

function OptionRow({
  label,
  onPress,
  isDanger = false,
  isBold = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  isDanger?: boolean;
  isBold?: boolean;
  testID: string;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
      testID={testID}
    >
      <Text style={[styles.label, isDanger ? styles.danger : null, isBold ? styles.bold : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    group: {
      borderRadius: radii.lg,
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceRaised,
    },
    closeGroup: {
      marginTop: spacing.sm,
    },
    row: {
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    pressed: {
      opacity: 0.7,
    },
    label: {
      color: theme.colors.text,
      fontSize: 17,
      fontWeight: fontWeight.medium,
    },
    danger: {
      color: theme.colors.danger,
    },
    bold: {
      fontWeight: fontWeight.semibold,
    },
  });
