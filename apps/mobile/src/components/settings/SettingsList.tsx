import { fontSize, fontWeight, spacing } from '@product/brand';
import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Glyph, type GlyphName } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';

const ROW_ICON_SIZE = 32;
const GROUP_RADIUS = 18;

/** A rounded block of rows with a hairline between each. */
export function SettingsGroup({
  children,
  isSpaced = true,
}: {
  children: ReactNode;
  isSpaced?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const rows = Children.toArray(children).filter(isValidElement);

  return (
    <View style={[styles.group, isSpaced ? styles.spaced : null]}>
      {rows.map((row, index) => (
        <Fragment key={row.key ?? index}>
          {index > 0 ? <View style={styles.divider} /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

export function SettingsSectionTitle({ children }: { children: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <Text accessibilityRole="header" style={styles.sectionTitle}>
      {children}
    </Text>
  );
}

/** A quiet line under a group, saying where a value is used, or the rule a field breaks. */
export function SettingsNote({
  children,
  centered = false,
  tone = 'muted',
  testID,
}: {
  children: ReactNode;
  centered?: boolean;
  tone?: 'muted' | 'error';
  testID?: string;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <Text
      accessibilityLiveRegion={tone === 'error' ? 'polite' : 'none'}
      style={[
        styles.note,
        centered ? styles.centered : null,
        tone === 'error' ? styles.error : null,
      ]}
      testID={testID}
    >
      {children}
    </Text>
  );
}

function RowIcon({ glyph }: { glyph: GlyphName }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.icon}>
      <Glyph color={colors.text} name={glyph} size={17} strokeWidth={2} />
    </View>
  );
}

function RowText({ label, meta }: { label: string; meta?: string | null }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.text}>
      <Text style={styles.label}>{label}</Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  );
}

interface SettingsLinkRowProps {
  label: string;
  onPress: () => void;
  glyph?: GlyphName;
  meta?: string | null;
  /** The current setting, shown before the chevron so most questions need no tap. */
  value?: string | null;
  valueTone?: 'muted' | 'warning';
  /** A small label in place of a value, such as Members. */
  tag?: string;
  /** Leaves the web or the app, so it shows an outward arrow instead of a chevron. */
  isExternal?: boolean;
  isDimmed?: boolean;
  testID?: string;
}

export function SettingsLinkRow({
  label,
  onPress,
  glyph,
  meta,
  value,
  valueTone = 'muted',
  tag,
  isExternal = false,
  isDimmed = false,
  testID,
}: SettingsLinkRowProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityHint={value ?? undefined}
      accessibilityLabel={label}
      accessibilityRole={isExternal ? 'link' : 'button'}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        isDimmed ? styles.dimmed : null,
        pressed ? styles.pressed : null,
      ]}
      testID={testID}
    >
      {glyph ? <RowIcon glyph={glyph} /> : null}
      <RowText label={label} meta={meta} />
      {tag ? <Text style={styles.tag}>{tag}</Text> : null}
      {value ? (
        <Text
          numberOfLines={1}
          style={[styles.value, valueTone === 'warning' ? styles.warning : null]}
        >
          {value}
        </Text>
      ) : null}
      <Glyph
        color={colors.muted}
        name={isExternal ? 'external' : 'forward'}
        size={16}
        strokeWidth={2}
      />
    </Pressable>
  );
}

interface SettingsSwitchRowProps {
  label: string;
  meta?: string | null;
  isOn: boolean;
  onChange: (next: boolean) => void;
  isBusy?: boolean;
  isDimmed?: boolean;
  /** Opens a choice that belongs to this switch, such as how long to wait. */
  onMetaPress?: () => void;
  testID: string;
}

export function SettingsSwitchRow({
  label,
  meta,
  isOn,
  onChange,
  isBusy = false,
  isDimmed = false,
  onMetaPress,
  testID,
}: SettingsSwitchRowProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const text = <RowText label={label} meta={meta} />;

  return (
    <View style={[styles.row, isDimmed ? styles.dimmed : null]}>
      {onMetaPress ? (
        <Pressable
          accessibilityHint={meta ?? undefined}
          accessibilityLabel={`${label} options`}
          accessibilityRole="button"
          onPress={onMetaPress}
          style={({ pressed }) => [styles.text, pressed ? styles.pressed : null]}
          testID={`${testID}-options`}
        >
          {text}
        </Pressable>
      ) : (
        text
      )}
      {isBusy ? <ActivityIndicator color={colors.muted} size="small" /> : null}
      <Switch
        accessibilityHint={meta ?? undefined}
        accessibilityLabel={label}
        disabled={isBusy}
        onValueChange={onChange}
        testID={testID}
        thumbColor={colors.surface}
        trackColor={{ false: colors.tickIdle, true: colors.accent }}
        value={isOn}
      />
    </View>
  );
}

/** A row that only states something, such as who sees what. */
export function SettingsInfoRow({
  glyph,
  label,
  meta,
}: {
  glyph: GlyphName;
  label: string;
  meta: string;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View accessible style={[styles.row, styles.infoRow]}>
      <RowIcon glyph={glyph} />
      <RowText label={label} meta={meta} />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    group: {
      backgroundColor: theme.colors.surface,
      borderRadius: GROUP_RADIUS,
      paddingHorizontal: 14,
    },
    spaced: {
      marginTop: 14,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
    },
    row: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
    },
    infoRow: {
      alignItems: 'flex-start',
    },
    pressed: {
      opacity: 0.7,
    },
    dimmed: {
      opacity: 0.45,
    },
    icon: {
      width: ROW_ICON_SIZE,
      height: ROW_ICON_SIZE,
      borderRadius: 10,
      backgroundColor: theme.colors.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      flex: 1,
      minWidth: 0,
    },
    label: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: fontWeight.medium,
    },
    meta: {
      color: theme.colors.muted,
      fontSize: 13,
      lineHeight: 17,
      marginTop: 2,
    },
    value: {
      flexShrink: 1,
      maxWidth: '45%',
      color: theme.colors.muted,
      fontSize: fontSize.sm,
    },
    warning: {
      color: theme.colors.warning,
    },
    tag: {
      overflow: 'hidden',
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 3,
      backgroundColor: theme.colors.surfaceRaised,
      color: theme.colors.muted,
      fontSize: 11,
      fontWeight: fontWeight.semibold,
    },
    sectionTitle: {
      marginTop: 22,
      marginBottom: 6,
      marginHorizontal: spacing.xs,
      color: theme.colors.muted,
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    note: {
      marginTop: spacing.sm,
      marginHorizontal: 6,
      color: theme.colors.muted,
      fontSize: 13,
      lineHeight: 19,
    },
    centered: {
      textAlign: 'center',
    },
    error: {
      color: theme.colors.danger,
    },
  });
