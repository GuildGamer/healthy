import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, fontWeight, spacing } from '@product/brand';
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Full-bleed select band — hairlines edge to edge so a dropdown sits in its
 * own strip. Use for any menu trigger that should not look like a text field.
 */
export function SelectBand({
  children,
  testID,
}: {
  children: ReactNode;
  testID?: string;
}) {
  return (
    <View style={styles.band} testID={testID}>
      {children}
    </View>
  );
}

export function SelectTrigger({
  accessibilityHint,
  accessibilityLabel,
  label,
  leading,
  onPress,
  testID,
  value,
}: {
  accessibilityHint?: string;
  accessibilityLabel: string;
  label: string;
  leading?: ReactNode;
  onPress: () => void;
  testID?: string;
  value: string;
}) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.trigger, pressed ? styles.triggerPressed : null]}
      testID={testID}
    >
      <Text style={styles.eyebrow}>{label}</Text>
      <View style={styles.valueRow}>
        {leading}
        <Text numberOfLines={1} style={styles.value}>
          {value}
        </Text>
        <Feather color={colors.muted} name="chevron-down" size={16} />
      </View>
    </Pressable>
  );
}

export function SelectSheet({
  children,
  closeTestID,
  onClose,
  title,
  visible,
  testID,
}: {
  children: ReactNode;
  closeTestID?: string;
  onClose: () => void;
  title: string;
  visible: boolean;
  testID?: string;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <View
        style={[
          styles.sheet,
          {
            paddingTop: Math.max(insets.top, spacing.md),
            paddingBottom: insets.bottom,
          },
        ]}
        testID={testID}
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            hitSlop={12}
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              pressed ? styles.closeButtonPressed : null,
            ]}
            testID={closeTestID}
          >
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>
        {children}
      </View>
    </Modal>
  );
}

export function SelectOptionRow({
  leading,
  meta,
  onPress,
  selected,
  testID,
  title,
}: {
  leading?: ReactNode;
  meta?: string;
  onPress: () => void;
  selected: boolean;
  testID?: string;
  title: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={styles.option}
      testID={testID}
    >
      {leading}
      <Text style={styles.optionTitle}>{title}</Text>
      {meta ? <Text style={styles.optionMeta}>{meta}</Text> : null}
      {selected ? (
        <Feather color={colors.accent} name="check" size={16} style={styles.checkIcon} />
      ) : (
        <View style={styles.checkSpacer} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  band: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  trigger: {
    gap: 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  triggerPressed: {
    backgroundColor: colors.surface,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  value: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.background,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  closeButton: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  closeButtonPressed: {
    opacity: 0.7,
  },
  close: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  option: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionTitle: {
    flex: 1,
    flexShrink: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    paddingTop: 2,
  },
  optionMeta: {
    color: colors.muted,
    fontSize: fontSize.xs,
    minWidth: 20,
    textAlign: 'right',
    paddingTop: 2,
  },
  checkIcon: {
    marginTop: 2,
  },
  checkSpacer: {
    width: 16,
    marginTop: 2,
  },
});
