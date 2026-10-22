import { spacing } from '@product/brand';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Animated, type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { DECK_CARD_RADIUS, DECK_PEEK_OFFSET } from '@/components/deck';
import { useReduceMotion } from '@/lib/use-reduce-motion';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { TODAY_COPY } from './constants/today-copy';
import { DeckDots } from './DeckDots';
import { deckPeekGeometry } from './deck-peek';
import type { DeckItem, TodayFocus } from './types/today-deck';
import { useDeckSwipe } from './useDeckSwipe';
import { useSwipeHint } from './useSwipeHint';

const CARD_TILT_DEGREES = 9;
/** Healthy night dims the next card's own fill; Clinic white's grey edge is already quiet. */
const RESTING_UNDER_OPACITY = { dimmed: 0.7, covered: 1 } as const;

interface TodayDeckProps {
  items: readonly DeckItem[];
  /** Finished cards, shown as dots ahead of the deck. */
  doneCount: number;
  renderItem: (item: DeckItem) => ReactNode;
  /** A challenge to open on, such as from its reminder. */
  focus?: TodayFocus | null;
}

/** Where a challenge's card sits in the deck, or null when it is not dealt. */
function focusIndexFor(items: readonly DeckItem[], focus: TodayFocus | null): number | null {
  if (!focus) {
    return null;
  }

  const index = items.findIndex(
    (item) => item.type === 'challenge' && item.challenge.challengeId === focus.challengeId,
  );
  return index >= 0 ? index : null;
}

function underCardStyle(translateX: Animated.Value, cardWidth: number, isCovered: boolean) {
  const width = Math.max(cardWidth, 1);
  const { restingScale, restingLift } = deckPeekGeometry(cardWidth);
  const reveal = translateX.interpolate({
    inputRange: [-width, 0, width],
    outputRange: [1, 0, 1],
    extrapolate: 'clamp',
  });

  return {
    card: {
      opacity: reveal.interpolate({
        inputRange: [0, 1],
        outputRange: [isCovered ? RESTING_UNDER_OPACITY.covered : RESTING_UNDER_OPACITY.dimmed, 1],
      }),
      transform: [
        { translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [restingLift, 0] }) },
        { scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [restingScale, 1] }) },
      ],
    },
    /** Hides the card's face while it rests behind, and lifts away as it is revealed. */
    cover: {
      opacity: reveal.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
    },
  };
}

function topCardStyle(translateX: Animated.Value, cardWidth: number) {
  const width = Math.max(cardWidth, 1);
  const rotate = translateX.interpolate({
    inputRange: [-width, 0, width],
    outputRange: [`-${CARD_TILT_DEGREES}deg`, '0deg', `${CARD_TILT_DEGREES}deg`],
  });

  return { transform: [{ translateX }, { rotate }] };
}

/**
 * You only ever hold the top card; the next one's edge shows how much is left.
 * The last card has nothing behind it, as on the board.
 */
export function TodayDeck({ items, doneCount, renderItem, focus = null }: TodayDeckProps) {
  const styles = useThemedStyles(createStyles);
  const { deckCards } = useTheme();
  const isReduceMotionEnabled = useReduceMotion();
  const { isHintVisible, dismissHint } = useSwipeHint();
  const [cardWidth, setCardWidth] = useState(0);
  const swipe = useDeckSwipe({
    count: items.length,
    cardWidth,
    isReduceMotionEnabled,
    onDeal: dismissHint,
    focusIndex: focusIndexFor(items, focus),
  });

  useEffect(() => {
    focus?.onHandled();
  }, [focus]);

  const underStyle = useMemo(
    () => underCardStyle(swipe.translateX, cardWidth, deckCards.hasToneRail),
    [swipe.translateX, cardWidth, deckCards.hasToneRail],
  );
  const topStyle = useMemo(
    () => topCardStyle(swipe.translateX, cardWidth),
    [swipe.translateX, cardWidth],
  );
  const topItem = items[swipe.activeIndex];
  const underItem = items[swipe.activeIndex + 1];
  const canSwipe = items.length > 1;
  const showsDots = doneCount + items.length > 1;

  if (!topItem) {
    return null;
  }

  return (
    <View testID="home-deck">
      <View
        onLayout={(event: LayoutChangeEvent) => setCardWidth(event.nativeEvent.layout.width)}
        style={styles.stack}
        {...(canSwipe ? swipe.panHandlers : {})}
      >
        {underItem ? (
          <Animated.View
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            key={underItem.key}
            pointerEvents="none"
            style={[styles.under, underStyle.card]}
            testID="home-deck-under"
          >
            {renderItem(underItem)}
            {deckCards.hasToneRail ? (
              <Animated.View
                style={[styles.underCover, underStyle.cover]}
                testID="home-deck-under-cover"
              />
            ) : null}
          </Animated.View>
        ) : null}
        <Animated.View key={topItem.key} style={topStyle} testID="home-deck-top">
          {renderItem(topItem)}
        </Animated.View>
      </View>
      {showsDots ? (
        <DeckDots
          activeIndex={swipe.activeIndex}
          cardCount={items.length}
          doneCount={doneCount}
          onNext={swipe.dealNext}
          onPrevious={swipe.dealPrevious}
        />
      ) : null}
      {canSwipe && isHintVisible ? (
        <Text style={styles.hint} testID="home-swipe-hint">
          {TODAY_COPY.swipeHint}
        </Text>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    stack: {
      marginTop: DECK_PEEK_OFFSET,
      marginBottom: spacing.md,
    },
    under: {
      ...StyleSheet.absoluteFillObject,
    },
    /** Clinic white draws the card behind as a plain grey edge, with no rail or face. */
    underCover: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: DECK_CARD_RADIUS,
      backgroundColor: theme.colors.border,
    },
    hint: {
      color: theme.colors.muted,
      fontSize: 13,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
  });
