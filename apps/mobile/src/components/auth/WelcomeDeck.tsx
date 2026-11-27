import { radii, spacing } from '@product/brand';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useReduceMotion } from '@/lib/use-reduce-motion';
import { type Theme, useThemedStyles } from '@/theme';
import {
  WELCOME_DECK_CARDS,
  WELCOME_DECK_DRAG_TILT_DEG,
  WELCOME_DECK_DWELL_MS,
  WELCOME_DECK_SLOT_SCALES,
  WELCOME_DECK_SLOT_STEP,
  WELCOME_DECK_SLOT_VEILS,
} from './constants/welcome-deck';
import { DECK_CARD_HEIGHT, DeckCard } from './DeckCard';
import { deckSlot } from './deck-order';
import { createWelcomeDeckMotion, type DeckCardMotion } from './welcome-deck-motion';

const CARD_COUNT = WELCOME_DECK_CARDS.length;
const SLOT_INPUT = WELCOME_DECK_SLOT_SCALES.map((_, slot) => slot);
const PEEK_HEIGHT = WELCOME_DECK_SLOT_STEP * (CARD_COUNT - 1);
const DECK_ACCESSIBILITY_LABEL = `Examples of daily challenges: ${WELCOME_DECK_CARDS.map(
  (card) => card.title,
).join(', ')}`;

/**
 * Today's deck, peeking: the top example is dealt away every few seconds, or
 * by a sideways swipe, and the next one comes up.
 */
export function WelcomeDeck({ testID = 'welcome-deck' }: { testID?: string }) {
  const styles = useThemedStyles(createStyles);
  const isReduceMotionEnabled = useReduceMotion();
  const [topIndex, setTopIndex] = useState(0);
  const [deckWidth, setDeckWidth] = useState(0);
  const [isHeld, setIsHeld] = useState(false);
  const [motion] = useState(() => createWelcomeDeckMotion(WELCOME_DECK_CARDS, setTopIndex));

  useEffect(() => {
    motion.revealDealtCard();
  }, [motion, topIndex]);

  useEffect(() => {
    if (isReduceMotionEnabled || isHeld) {
      return;
    }

    const dwell = setTimeout(() => motion.dealTopCard(-1), WELCOME_DECK_DWELL_MS);
    return () => clearTimeout(dwell);
  }, [motion, topIndex, isHeld, isReduceMotionEnabled]);

  const topCard = motion.cardAt(topIndex).content;

  return (
    <View
      accessibilityActions={[{ name: 'increment', label: 'Next example' }]}
      accessibilityLabel={DECK_ACCESSIBILITY_LABEL}
      accessibilityRole="adjustable"
      accessibilityValue={{ text: `${topCard.title}, ${topIndex + 1} of ${CARD_COUNT}` }}
      accessible
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment') {
          motion.dealTopCard(-1);
        }
      }}
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        setDeckWidth(width);
        motion.setDeckWidth(width);
      }}
      onTouchCancel={() => setIsHeld(false)}
      onTouchEnd={() => setIsHeld(false)}
      onTouchStart={() => setIsHeld(true)}
      style={styles.deck}
      testID={testID}
      {...motion.panHandlers}
    >
      {motion.cards.map((cardMotion, cardIndex) => (
        <DeckSlotCard
          cardMotion={cardMotion}
          deckWidth={deckWidth}
          key={cardMotion.content.id}
          stackOrder={CARD_COUNT - deckSlot(cardIndex, topIndex, CARD_COUNT)}
        />
      ))}
    </View>
  );
}

interface DeckSlotCardProps {
  cardMotion: DeckCardMotion;
  deckWidth: number;
  stackOrder: number;
}

function DeckSlotCard({ cardMotion, deckWidth, stackOrder }: DeckSlotCardProps) {
  const styles = useThemedStyles(createStyles);
  const { content, slot, presence, offsetX } = cardMotion;
  const tiltRange = Math.max(deckWidth, 1);

  const stackTransform = [
    {
      translateY: slot.interpolate({
        inputRange: SLOT_INPUT,
        outputRange: SLOT_INPUT.map((slotIndex) => -slotIndex * WELCOME_DECK_SLOT_STEP),
      }),
    },
    {
      scale: slot.interpolate({
        inputRange: SLOT_INPUT,
        outputRange: [...WELCOME_DECK_SLOT_SCALES],
      }),
    },
  ];
  const dragTransform = [
    { translateX: offsetX },
    {
      rotate: offsetX.interpolate({
        inputRange: [-tiltRange, 0, tiltRange],
        outputRange: [
          `-${WELCOME_DECK_DRAG_TILT_DEG}deg`,
          '0deg',
          `${WELCOME_DECK_DRAG_TILT_DEG}deg`,
        ],
      }),
    },
  ];
  const veilOpacity = slot.interpolate({
    inputRange: SLOT_INPUT,
    outputRange: [...WELCOME_DECK_SLOT_VEILS],
  });

  return (
    <Animated.View
      style={[styles.slot, { zIndex: stackOrder, opacity: presence, transform: stackTransform }]}
    >
      <Animated.View style={[styles.card, { transform: dragTransform }]}>
        <DeckCard card={content} />
        <Animated.View pointerEvents="none" style={[styles.veil, { opacity: veilOpacity }]} />
      </Animated.View>
    </Animated.View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    deck: {
      height: PEEK_HEIGHT + DECK_CARD_HEIGHT + WELCOME_DECK_SLOT_STEP,
      marginTop: spacing.lg,
    },
    /** Scaled from the top edge, so cards behind peek out above. */
    slot: {
      position: 'absolute',
      top: PEEK_HEIGHT,
      left: 0,
      right: 0,
      transformOrigin: 'top',
    },
    /** Tilted from the bottom edge, so the top leads the way a finger drags. */
    card: {
      borderRadius: radii.xl,
      transformOrigin: 'bottom',
    },
    veil: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: radii.xl,
      backgroundColor: theme.colors.background,
    },
  });
