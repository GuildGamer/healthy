import { spacing } from '@product/brand';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RefreshableScroll } from '@/components/feedback';
import { type Theme, useThemedStyles } from '@/theme';

const PAGE_GUTTER = 20;

interface GroupPageProps {
  nav: ReactNode;
  children: ReactNode;
  /** Buttons pinned to the foot of the page, above the home indicator. */
  dock?: ReactNode;
  /** Pull to refresh, for a page that shows live scores. */
  onPullRefresh?: () => Promise<unknown>;
  testID?: string;
}

/** A pushed group page: its nav, what scrolls, and what stays pinned. */
export function GroupPage({ nav, children, dock, onPullRefresh, testID }: GroupPageProps) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const contentStyle = [
    styles.content,
    dock ? null : { paddingBottom: insets.bottom + spacing.xl },
  ];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.nav}>{nav}</View>
      {onPullRefresh ? (
        <RefreshableScroll
          contentContainerStyle={contentStyle}
          onPullRefresh={onPullRefresh}
          testID={testID}
        >
          {children}
        </RefreshableScroll>
      ) : (
        <ScrollView contentContainerStyle={contentStyle} testID={testID}>
          {children}
        </ScrollView>
      )}
      {dock ? (
        <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          {dock}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    nav: {
      paddingHorizontal: PAGE_GUTTER,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: PAGE_GUTTER,
      paddingBottom: spacing.lg,
    },
    dock: {
      gap: 10,
      paddingHorizontal: PAGE_GUTTER,
      paddingTop: 12,
      backgroundColor: theme.colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
  });
