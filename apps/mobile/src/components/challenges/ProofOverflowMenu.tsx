import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type Theme, useThemedStyles } from '@/theme';

/** Matches `DeckPageNav` height so the menu sits just under the dots. */
export const PROOF_OVERFLOW_NAV_OFFSET = 40;

export type ProofOverflowAction = {
  label: string;
  onPress: () => void;
  testID: string;
  loading?: boolean;
  isDanger?: boolean;
};

type ProofOverflowMenuProps = {
  actions: readonly ProofOverflowAction[];
  onDismiss: () => void;
};

/**
 * Anchored under the page nav's trailing dots. A full-screen press behind it
 * closes without running an action.
 */
export function ProofOverflowMenu({ actions, onDismiss }: ProofOverflowMenuProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View pointerEvents="box-none" style={styles.root} testID="proof-overflow-menu">
      <Pressable
        accessibilityLabel="Dismiss"
        accessibilityRole="button"
        onPress={onDismiss}
        style={styles.scrim}
        testID="proof-overflow-scrim"
      />
      <View style={styles.panel} testID="proof-overflow-panel">
        {actions.map((action) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: action.loading }}
            disabled={action.loading}
            key={action.testID}
            onPress={action.onPress}
            style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
            testID={action.testID}
          >
            <Text style={[styles.label, action.isDanger ? styles.danger : null]}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 20,
    },
    scrim: {
      ...StyleSheet.absoluteFillObject,
    },
    panel: {
      position: 'absolute',
      top: PROOF_OVERFLOW_NAV_OFFSET + spacing.xs,
      right: 0,
      minWidth: 160,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      overflow: 'hidden',
      zIndex: 21,
    },
    row: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
    },
    pressed: {
      backgroundColor: theme.colors.background,
    },
    label: {
      color: theme.colors.text,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
    },
    danger: {
      color: theme.colors.danger,
    },
  });
