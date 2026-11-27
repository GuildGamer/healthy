import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Glyph } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';

const NAV_BUTTON_SIZE = 40;

interface FrontDoorLayoutProps {
  children: ReactNode;
  /** Actions pinned under the content, above the keyboard. */
  dock?: ReactNode;
  /** Omitted once the account exists: there is nothing to go back to. */
  onBackPress?: () => void;
  backIcon?: 'back' | 'close';
  testID?: string;
}

/**
 * The shell for every screen before Today: a round back button, scrolling
 * content, and a dock that rides above the keyboard.
 */
export function FrontDoorLayout({
  children,
  dock,
  onBackPress,
  backIcon = 'back',
  testID,
}: FrontDoorLayoutProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen} testID={testID}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {onBackPress ? <NavButton icon={backIcon} onPress={onBackPress} /> : null}
          {children}
        </ScrollView>
        {dock ? <View style={styles.dock}>{dock}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function NavButton({ icon, onPress }: { icon: 'back' | 'close'; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityLabel={icon === 'close' ? 'Close' : 'Go back'}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.navButton, pressed ? styles.navButtonPressed : null]}
      testID="auth-back"
    >
      <Glyph color={colors.text} name={icon} size={20} strokeWidth={2.2} />
    </Pressable>
  );
}

/** The one title a front-door screen gets, with an optional line under it. */
export function FrontDoorTitle({
  title,
  subtitle,
  centered = false,
}: {
  title: string;
  subtitle?: ReactNode;
  centered?: boolean;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.titleBlock, centered ? styles.centered : null]}>
      <Text
        accessibilityRole="header"
        style={[styles.title, centered ? styles.centeredText : null]}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, centered ? styles.centeredText : null]}>{subtitle}</Text>
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
    flex: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.lg,
    },
    dock: {
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      backgroundColor: theme.colors.background,
    },
    navButton: {
      width: NAV_BUTTON_SIZE,
      height: NAV_BUTTON_SIZE,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
    navButtonPressed: {
      backgroundColor: theme.colors.surfaceRaised,
    },
    titleBlock: {
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    centered: {
      alignItems: 'center',
    },
    centeredText: {
      textAlign: 'center',
    },
    title: {
      color: theme.colors.text,
      fontSize: fontSize.headline,
      fontWeight: fontWeight.semibold,
      letterSpacing: -0.9,
      lineHeight: fontSize.headline * 1.1,
    },
    subtitle: {
      color: theme.colors.muted,
      fontSize: fontSize.md,
      lineHeight: 22,
    },
  });
