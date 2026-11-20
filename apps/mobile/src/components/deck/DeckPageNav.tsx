import { fontSize, fontWeight } from '@product/brand';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { type Theme, useThemedStyles } from '@/theme';
import { DeckNavButton } from './DeckNavButton';

const NAV_HEIGHT = 40;

interface DeckPageNavProps {
  title?: string;
  onBack: () => void;
  /** A page that closes rather than goes back, such as a sheet-like flow, shows a cross. */
  isClose?: boolean;
  /** A round button on the right, such as +. */
  right?: ReactNode;
  testID?: string;
}

/** The top of a pushed page: a round way back, and what the page is. */
export function DeckPageNav({
  title = '',
  onBack,
  isClose = false,
  right = null,
  testID,
}: DeckPageNavProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.row} testID={testID}>
      <DeckNavButton
        accessibilityLabel={isClose ? 'Close' : 'Back'}
        glyph={isClose ? 'close' : 'back'}
        onPage
        onPress={onBack}
        testID="page-back"
      />
      <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
        {title}
      </Text>
      <View style={styles.side}>{right}</View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      height: NAV_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      flex: 1,
      color: theme.colors.text,
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
      textAlign: 'center',
    },
    side: {
      minWidth: NAV_HEIGHT,
      alignItems: 'flex-end',
    },
  });
