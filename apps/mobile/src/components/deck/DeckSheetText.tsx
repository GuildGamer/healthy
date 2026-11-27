import { fontSize, fontWeight } from '@product/brand';
import { StyleSheet, Text } from 'react-native';
import { type Theme, useThemedStyles } from '@/theme';
import { DECK_SHEET_TITLE_SIZE } from './constants';

/** A sheet's headline, such as "Show us the monitor." */
export function DeckSheetTitle({ children, testID }: { children: string; testID?: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <Text accessibilityRole="header" style={styles.title} testID={testID}>
      {children}
    </Text>
  );
}

/** The plain sentence under a sheet's headline. */
export function DeckSheetSub({ children }: { children: string }) {
  const styles = useThemedStyles(createStyles);
  return <Text style={styles.sub}>{children}</Text>;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    title: {
      color: theme.colors.text,
      fontSize: DECK_SHEET_TITLE_SIZE,
      fontWeight: fontWeight.semibold,
      letterSpacing: -0.5,
      lineHeight: 30,
      marginTop: 10,
    },
    sub: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      lineHeight: 21,
      marginTop: 6,
    },
  });
