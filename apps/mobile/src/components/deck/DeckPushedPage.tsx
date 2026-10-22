import { spacing } from '@product/brand';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RefreshableScroll } from '@/components/feedback';
import { type Theme, useThemedStyles } from '@/theme';
import { DeckPageNav } from './DeckPageNav';

interface DeckPushedPageProps {
  title: string;
  onBack: () => void;
  /** A round button on the right of the title, such as ?. */
  navRight?: ReactNode;
  onPullRefresh: () => Promise<unknown>;
  children: ReactNode;
  testID?: string;
}

/** A page pushed over the tabs to look back at something: a way back, its name, a list. */
export function DeckPushedPage({
  title,
  onBack,
  navRight,
  onPullRefresh,
  children,
  testID,
}: DeckPushedPageProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <SafeAreaView edges={['top']} style={styles.screen} testID={testID}>
      <View style={styles.nav}>
        <DeckPageNav onBack={onBack} right={navRight} title={title} />
      </View>
      <RefreshableScroll contentContainerStyle={styles.content} onPullRefresh={onPullRefresh}>
        {children}
      </RefreshableScroll>
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
      paddingHorizontal: 20,
      paddingTop: spacing.sm,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingBottom: spacing.xl,
    },
  });
