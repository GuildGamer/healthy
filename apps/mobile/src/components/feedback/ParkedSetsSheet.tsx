import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { DeckButton } from '@/components/deck';
import { requeueParkedCompletions, type PendingCompletion } from '@/lib/completion-outbox';
import { flushPendingCompletions } from '@/lib/completion-sync';
import { type Theme, useThemedStyles } from '@/theme';

export type ParkedSetsSheetProps = {
  visible: boolean;
  entries: readonly PendingCompletion[];
  onDismiss: () => void;
};

function entryLabel(entry: PendingCompletion): string {
  if (entry.kind === 'submit_match_attempt') {
    return `${entry.input.count} on a contest`;
  }
  if (entry.kind === 'record_practice') {
    return `${entry.input.count ?? 0} ${entry.input.metric}`;
  }
  const count = entry.payload.deviceActivity?.count;
  return count != null ? `${count} on today’s challenge` : 'Today’s challenge';
}

/**
 * Lists sets the server permanently rejected, with a manual retry that also
 * re-queues them after an app update.
 */
export function ParkedSetsSheet({ visible, entries, onDismiss }: ParkedSetsSheetProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onDismiss}
      transparent
      visible={visible}
    >
      <Pressable accessibilityRole="button" onPress={onDismiss} style={styles.scrim} />
      <View style={styles.sheet} testID="parked-sets-sheet">
        <Text style={styles.title}>Sets that need attention</Text>
        <Text style={styles.body}>
          These didn’t save. We’ll try again after you update the app, or you can retry now.
        </Text>
        {entries.map((entry) => (
          <View key={entry.id} style={styles.row}>
            <Text style={styles.rowTitle}>{entryLabel(entry)}</Text>
            <Text style={styles.rowMeta}>{entry.lastError ?? 'Couldn’t save'}</Text>
          </View>
        ))}
        <DeckButton
          label="Try again"
          onPress={() => {
            void (async () => {
              await requeueParkedCompletions();
              await flushPendingCompletions();
            })();
            onDismiss();
          }}
          testID="parked-sets-retry"
        />
        <DeckButton label="Not now" onPress={onDismiss} testID="parked-sets-dismiss" variant="quiet" />
      </View>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.scrim,
    },
    sheet: {
      position: 'absolute',
      left: spacing.md,
      right: spacing.md,
      bottom: spacing.lg,
      borderRadius: radii.lg,
      backgroundColor: theme.colors.surfaceRaised,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    title: {
      color: theme.colors.text,
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
    },
    body: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      lineHeight: 20,
      marginBottom: spacing.sm,
    },
    row: {
      paddingVertical: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      gap: 2,
    },
    rowTitle: {
      color: theme.colors.text,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
    },
    rowMeta: {
      color: theme.colors.muted,
      fontSize: fontSize.xs,
      lineHeight: 16,
    },
  });
