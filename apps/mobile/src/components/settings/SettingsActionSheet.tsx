import { fontWeight, spacing } from '@product/brand';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Theme, useThemedStyles } from '@/theme';

export interface SettingsSheetAction {
  label: string;
  onPress: () => void;
  isDestructive?: boolean;
  testID: string;
}

interface SettingsActionSheetProps {
  visible: boolean;
  title: string;
  body: string;
  actions: readonly SettingsSheetAction[];
  onCancel: () => void;
  testID?: string;
}

/** A short choice from the bottom: what it is, one or two actions, and Cancel. */
export function SettingsActionSheet({
  visible,
  title,
  body,
  actions,
  onCancel,
  testID,
}: SettingsActionSheetProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <Pressable
        accessibilityLabel="Cancel"
        accessibilityRole="button"
        onPress={onCancel}
        style={styles.scrim}
      />
      <View style={[styles.sheet, { bottom: insets.bottom + spacing.sm }]} testID={testID}>
        <View style={styles.group}>
          <View style={styles.head}>
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            <Text style={styles.body}>{body}</Text>
          </View>
          {actions.map((action) => (
            <Pressable
              accessibilityRole="button"
              key={action.testID}
              onPress={action.onPress}
              style={({ pressed }) => [styles.action, pressed ? styles.pressed : null]}
              testID={action.testID}
            >
              <Text style={[styles.actionLabel, action.isDestructive ? styles.destructive : null]}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={[styles.group, styles.cancelGroup]}>
          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            style={({ pressed }) => [
              styles.action,
              styles.firstAction,
              pressed ? styles.pressed : null,
            ]}
            testID={testID ? `${testID}-cancel` : undefined}
          >
            <Text style={[styles.actionLabel, styles.cancelLabel]}>Cancel</Text>
          </Pressable>
        </View>
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
      left: 10,
      right: 10,
    },
    group: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      overflow: 'hidden',
    },
    cancelGroup: {
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
    action: {
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    firstAction: {
      borderTopWidth: 0,
    },
    pressed: {
      backgroundColor: theme.colors.surfaceRaised,
    },
    actionLabel: {
      color: theme.colors.text,
      fontSize: 17,
      fontWeight: fontWeight.medium,
    },
    destructive: {
      color: theme.colors.danger,
    },
    cancelLabel: {
      fontWeight: fontWeight.semibold,
    },
  });
