import { fontWeight, radii, spacing } from '@product/brand';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type Theme, useThemedStyles } from '@/theme';
import { DeckSheetModal } from './DeckSheetModal';

export type DeckChoiceAction = {
  label: string;
  onPress: () => void;
  testID: string;
  isDanger?: boolean;
};

interface DeckChoiceSheetProps {
  visible: boolean;
  actions: readonly DeckChoiceAction[];
  onClose: () => void;
  /** Close on group and proof menus; Cancel on settings confirms. */
  closeLabel?: string;
  title?: string;
  body?: string;
  /** Fires after the host Modal has dismissed — use before presenting another native screen. */
  onHidden?: () => void;
  testID?: string;
  closeTestID?: string;
}

/**
 * A short list of choices from the bottom: grey group, hairline between rows,
 * and a separate Close card. Matches the group options sheet.
 */
export function DeckChoiceSheet({
  visible,
  actions,
  onClose,
  closeLabel = 'Close',
  title,
  body,
  onHidden,
  testID,
  closeTestID,
}: DeckChoiceSheetProps) {
  const styles = useThemedStyles(createStyles);
  const resolvedCloseTestID = closeTestID ?? (testID ? `${testID}-close` : undefined);

  return (
    <DeckSheetModal onDismiss={onClose} onHidden={onHidden} testID={testID} visible={visible}>
      <View style={styles.group}>
        {title || body ? (
          <View style={[styles.head, styles.rowDivider]}>
            {title ? (
              <Text accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
            ) : null}
            {body ? <Text style={styles.body}>{body}</Text> : null}
          </View>
        ) : null}
        {actions.map((action, index) => {
          const isLast = index === actions.length - 1;
          return (
            <Pressable
              accessibilityRole="button"
              key={action.testID}
              onPress={action.onPress}
              style={({ pressed }) => [
                styles.row,
                isLast ? null : styles.rowDivider,
                pressed ? styles.pressed : null,
              ]}
              testID={action.testID}
            >
              <Text style={[styles.label, action.isDanger ? styles.danger : null]}>
                {action.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.group, styles.closeGroup]}>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
          testID={resolvedCloseTestID}
        >
          <Text style={[styles.label, styles.closeLabel]}>{closeLabel}</Text>
        </Pressable>
      </View>
    </DeckSheetModal>
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
    head: {
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: 18,
      paddingVertical: spacing.md,
    },
    title: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: fontWeight.semibold,
      textAlign: 'center',
    },
    body: {
      color: theme.colors.muted,
      fontSize: 13.5,
      lineHeight: 19,
      textAlign: 'center',
    },
    row: {
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.tickIdle,
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
    closeLabel: {
      fontWeight: fontWeight.semibold,
    },
  });
