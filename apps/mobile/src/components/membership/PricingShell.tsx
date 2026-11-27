import { fontSize, fontWeight, spacing } from '@product/brand';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeckNavButton } from '@/components/deck';
import { type Theme, useThemedStyles } from '@/theme';

const NAV_HEIGHT = 40;

interface PricingShellProps {
  onClose: () => void;
  /** The way out reads Not now while the page is still offering something. */
  closeLabel: string;
  dock?: ReactNode;
  children: ReactNode;
  testID?: string;
}

/** Membership opens over whatever reached it, so its way out is a close, not a back. */
export function PricingShell({ onClose, closeLabel, dock, children, testID }: PricingShellProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen} testID={testID}>
      <View style={styles.nav}>
        <DeckNavButton
          accessibilityLabel={closeLabel}
          glyph="close"
          onPage
          onPress={onClose}
          testID="pricing-close"
        />
        <Text accessibilityRole="header" style={styles.title}>
          Membership
        </Text>
        <View style={styles.navSide} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
      {dock ? <View style={styles.dock}>{dock}</View> : null}
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    nav: {
      height: NAV_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.sm,
      paddingHorizontal: 20,
    },
    title: {
      flex: 1,
      color: theme.colors.text,
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
      textAlign: 'center',
    },
    navSide: {
      width: NAV_HEIGHT,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingBottom: spacing.lg,
    },
    dock: {
      gap: spacing.xs,
      paddingHorizontal: 20,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },
  });
