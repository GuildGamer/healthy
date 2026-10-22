import { fontSize, fontWeight, spacing } from '@product/brand';
import type { ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Glyph } from '@/components/icons';
import { PRIVACY_URL, TERMS_URL } from '@/lib/config';
import { type Theme, useTheme, useThemedStyles } from '@/theme';

/** A quiet line under a field saying where its value is used. */
export function FieldNote({
  children,
  centered = false,
}: {
  children: ReactNode;
  centered?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  return <Text style={[styles.note, centered ? styles.centered : null]}>{children}</Text>;
}

export function FieldError({
  children,
  centered = false,
  testID,
}: {
  children: ReactNode;
  centered?: boolean;
  testID?: string;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <Text
      accessibilityLiveRegion="polite"
      style={[styles.error, centered ? styles.centered : null]}
      testID={testID}
    >
      {children}
    </Text>
  );
}

/** A rule shown before typing, which turns into a tick once it is met. */
export function FieldRule({ text, met }: { text: string; met: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  if (!met) {
    return <Text style={styles.note}>{text}</Text>;
  }

  return (
    <View accessibilityLabel={`${text}, done`} style={styles.ruleMet}>
      <Glyph color={colors.accent} name="check" size={14} strokeWidth={3} />
      <Text style={styles.ruleMetText}>{text}</Text>
    </View>
  );
}

/** Pressing a sign-in button is the agreement, so the terms are one line. */
export function TermsLine() {
  const styles = useThemedStyles(createStyles);

  return (
    <Text style={styles.terms}>
      By continuing you agree to the{' '}
      <Text
        accessibilityRole="link"
        onPress={() => void Linking.openURL(TERMS_URL)}
        style={styles.termsLink}
      >
        Terms
      </Text>{' '}
      and{' '}
      <Text
        accessibilityRole="link"
        onPress={() => void Linking.openURL(PRIVACY_URL)}
        style={styles.termsLink}
      >
        Privacy Policy
      </Text>
      .
    </Text>
  );
}

/** `Lead · Action` under the dock buttons, such as I have an account · Log in. */
export function SwitchLink({
  lead,
  action,
  onPress,
  testID,
}: {
  lead: string;
  action: string;
  onPress: () => void;
  testID?: string;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityLabel={`${lead}. ${action}`}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.switchLink}
      testID={testID}
    >
      <Text style={styles.switchLead}>
        {lead} <Text style={styles.switchAction}>{action}</Text>
      </Text>
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    note: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      lineHeight: 19,
      marginTop: spacing.sm,
      marginHorizontal: spacing.xs,
    },
    error: {
      color: theme.colors.danger,
      fontSize: fontSize.sm,
      lineHeight: 19,
      marginTop: spacing.sm,
      marginHorizontal: spacing.xs,
    },
    centered: {
      textAlign: 'center',
    },
    ruleMet: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: spacing.sm,
      marginHorizontal: spacing.xs,
    },
    ruleMetText: {
      color: theme.colors.accent,
      fontSize: fontSize.sm,
    },
    terms: {
      color: theme.colors.muted,
      fontSize: fontSize.xs,
      lineHeight: 18,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
    termsLink: {
      color: theme.colors.text,
      textDecorationLine: 'underline',
    },
    switchLink: {
      alignItems: 'center',
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
    },
    switchLead: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
    },
    switchAction: {
      color: theme.colors.text,
      fontWeight: fontWeight.semibold,
    },
  });
