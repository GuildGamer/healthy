import { spacing } from '@product/brand';
import { type AccessibilityActionEvent, StyleSheet, View } from 'react-native';
import { type Theme, useThemedStyles } from '@/theme';

const DOT_SIZE = 6;
const ACTIVE_DOT_WIDTH = 20;

interface DeckDotsProps {
  doneCount: number;
  cardCount: number;
  activeIndex: number;
  onNext: () => void;
  onPrevious: () => void;
}

/**
 * Where you are in the day: finished cards first, then the one on top. Also
 * the deck's adjustable control, so VoiceOver can deal without a swipe.
 */
export function DeckDots({ doneCount, cardCount, activeIndex, onNext, onPrevious }: DeckDotsProps) {
  const styles = useThemedStyles(createStyles);
  const doneDots = Array.from({ length: doneCount }, (_, index) => `done-${index}`);
  const cardDots = Array.from({ length: cardCount }, (_, index) => index);

  function handleAction(event: AccessibilityActionEvent) {
    if (event.nativeEvent.actionName === 'increment') {
      onNext();
      return;
    }

    if (event.nativeEvent.actionName === 'decrement') {
      onPrevious();
    }
  }

  return (
    <View
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      accessibilityLabel="Today's cards"
      accessibilityRole="adjustable"
      accessibilityValue={{ text: `Card ${activeIndex + 1} of ${cardCount}` }}
      accessible
      onAccessibilityAction={handleAction}
      style={styles.row}
      testID="home-deck-dots"
    >
      {doneDots.map((key) => (
        <View key={key} style={[styles.dot, styles.done]} />
      ))}
      {cardDots.map((index) => (
        <View key={index} style={[styles.dot, index === activeIndex ? styles.active : null]} />
      ))}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: spacing.xs,
    },
    dot: {
      width: DOT_SIZE,
      height: DOT_SIZE,
      borderRadius: DOT_SIZE / 2,
      backgroundColor: theme.colors.surfaceRaised,
    },
    done: {
      backgroundColor: theme.colors.primary,
      opacity: theme.deckCards.hasToneRail ? 0.35 : 1,
    },
    active: {
      width: ACTIVE_DOT_WIDTH,
      backgroundColor: theme.colors.text,
    },
  });
