import { spacing } from '@product/brand';
import { type ReactNode, useEffect, useRef } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReduceMotion } from '@/lib/use-reduce-motion';
import { type Theme, useThemedStyles } from '@/theme';
import { DECK_CARD_RADIUS } from './constants';

const SHEET_ENTRY_OFFSET = 480;
const SHEET_ENTRY_MS = 260;

interface DeckSheetProps {
  /** Tapping the dimmed page behind; omit while the sheet must stay, such as mid-save. */
  onDismiss?: () => void;
  children: ReactNode;
  testID?: string;
}

/** Slides up over Today for an act that needs a few numbers, and goes away when saved. */
export function DeckSheet({ onDismiss, children, testID }: DeckSheetProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const isReduceMotionEnabled = useReduceMotion();
  const entry = useRef(new Animated.Value(isReduceMotionEnabled ? 0 : SHEET_ENTRY_OFFSET)).current;

  useEffect(() => {
    if (isReduceMotionEnabled) {
      entry.setValue(0);
      return;
    }

    Animated.timing(entry, {
      toValue: 0,
      duration: SHEET_ENTRY_MS,
      useNativeDriver: true,
    }).start();
  }, [entry, isReduceMotionEnabled]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <Pressable
        accessibilityLabel="Close"
        accessibilityRole="button"
        disabled={!onDismiss}
        onPress={onDismiss}
        style={styles.scrim}
        testID="deck-sheet-scrim"
      />
      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + spacing.md, transform: [{ translateY: entry }] },
        ]}
        testID={testID}
      >
        <View style={styles.grabber} />
        {children}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.scrim,
    },
    sheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: DECK_CARD_RADIUS,
      borderTopRightRadius: DECK_CARD_RADIUS,
      paddingTop: 10,
      paddingHorizontal: 22,
    },
    grabber: {
      alignSelf: 'center',
      width: 38,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.colors.border,
      marginBottom: spacing.md,
    },
  });
