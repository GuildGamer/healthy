import { fontWeight, spacing } from '@product/brand';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeckNavButton } from '@/components/deck';
import { type Theme, useThemedStyles } from '@/theme';
import { WALK_COPY } from './constants/doing-copy';

interface SessionShellProps {
  /** The card's fill, so the whole phone reads as the card you lifted. */
  fill: string;
  onClose: () => void;
  dock: ReactNode;
  children: ReactNode;
  testID: string;
}

/** A full-phone session: the card's colour edge to edge, a way out on top, the actions docked below. */
export function SessionShell({ fill, onClose, dock, children, testID }: SessionShellProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.screen, { backgroundColor: fill, paddingTop: insets.top + spacing.sm }]}
      testID={testID}
    >
      <View style={styles.nav}>
        <DeckNavButton
          accessibilityLabel={WALK_COPY.close}
          glyph="close"
          onPress={onClose}
          testID="session-back"
        />
      </View>
      <View style={styles.body}>{children}</View>
      <View
        style={[styles.dock, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.md }]}
      >
        {dock}
      </View>
    </View>
  );
}

/** A session's title before it starts, such as "Ten-minute walk". */
export function SessionTitle({ children }: { children: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <Text accessibilityRole="header" numberOfLines={3} style={styles.title}>
      {children}
    </Text>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      paddingHorizontal: 22,
    },
    nav: {
      height: 40,
      flexDirection: 'row',
    },
    body: {
      flex: 1,
      paddingTop: 18,
    },
    dock: {
      gap: 6,
    },
    title: {
      color: theme.deckCards.text,
      fontSize: 38,
      fontWeight: fontWeight.semibold,
      letterSpacing: -1.2,
      lineHeight: 40,
      marginTop: 14,
    },
  });
