import { spacing } from '@product/brand';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeckPageNav } from '@/components/deck';
import { type Theme, useThemedStyles } from '@/theme';

interface SettingsPageProps {
  title: string;
  onBack: () => void;
  /** A text action on the right of the title, such as Save. */
  navRight?: ReactNode;
  /** Buttons pinned under the content, above the keyboard. */
  dock?: ReactNode;
  children: ReactNode;
  testID?: string;
}

/** One small page opened from Settings: a round way back, the page's name, its rows. */
export function SettingsPage({
  title,
  onBack,
  navRight,
  dock,
  children,
  testID,
}: SettingsPageProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen} testID={testID}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.nav}>
          <DeckPageNav onBack={onBack} right={navRight} title={title} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        {dock ? <View style={styles.dock}>{dock}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    flex: {
      flex: 1,
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
    dock: {
      gap: spacing.sm,
      paddingHorizontal: 20,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      backgroundColor: theme.colors.background,
    },
  });
