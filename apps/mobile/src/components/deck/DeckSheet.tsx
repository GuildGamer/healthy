import { spacing } from '@product/brand';
import { type ReactNode, useEffect, useRef } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReduceMotion } from '@/lib/use-reduce-motion';
import { type Theme, useThemedStyles } from '@/theme';
import { DECK_CARD_RADIUS } from './constants';

const SHEET_ENTRY_OFFSET = 480;
const SHEET_ENTRY_MS = 260;
/** Dimmed page left showing above a full sheet, so it still reads as a sheet you can dismiss. */
const SHEET_TOP_CLEARANCE = 24;
const SHEET_SIDE_PADDING = 22;

interface DeckSheetProps {
  /** Tapping the dimmed page behind; omit while the sheet must stay, such as mid-save. */
  onDismiss?: () => void;
  children: ReactNode;
  /** Pinned under the content, such as Done, so it stays reachable when a long list scrolls. */
  footer?: ReactNode;
  testID?: string;
}

/** Slides up over Today for an act that needs a few numbers, and goes away when saved. */
export function DeckSheet({ onDismiss, children, footer = null, testID }: DeckSheetProps) {
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
          {
            marginTop: insets.top + SHEET_TOP_CLEARANCE,
            paddingBottom: insets.bottom + spacing.md,
            transform: [{ translateY: entry }],
          },
        ]}
        testID={testID}
      >
        <View style={styles.grabber} />
        <ScrollView
          alwaysBounceVertical={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          style={styles.body}
        >
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
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
      flexShrink: 1,
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: DECK_CARD_RADIUS,
      borderTopRightRadius: DECK_CARD_RADIUS,
      paddingTop: 10,
    },
    grabber: {
      alignSelf: 'center',
      width: 38,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.colors.border,
      marginBottom: spacing.md,
    },
    body: {
      flexGrow: 0,
      flexShrink: 1,
    },
    content: {
      paddingHorizontal: SHEET_SIDE_PADDING,
    },
    footer: {
      paddingHorizontal: SHEET_SIDE_PADDING,
    },
  });
