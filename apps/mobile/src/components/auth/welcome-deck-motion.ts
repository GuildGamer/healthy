import {
  Animated,
  Easing,
  type GestureResponderHandlers,
  PanResponder,
  type PanResponderGestureState,
} from 'react-native';
import {
  type DealDirection,
  type DeckCardContent,
  WELCOME_DECK_DEAL_DISTANCE_PX,
  WELCOME_DECK_DEAL_MS,
  WELCOME_DECK_DEAL_TRAVEL,
  WELCOME_DECK_DEAL_VELOCITY,
  WELCOME_DECK_DRAG_CLAIM_PX,
  WELCOME_DECK_SETTLE_MS,
} from './constants/welcome-deck';
import { deckSlot, nextTopIndex } from './deck-order';

export interface DeckCardMotion {
  content: DeckCardContent;
  /** Where the card sits: 0 on top, fractional while it moves up. */
  slot: Animated.Value;
  /** 0 while a dealt card is away, so it can return to the back unseen. */
  presence: Animated.Value;
  /** Sideways travel of the top card, from a finger or a deal. */
  offsetX: Animated.Value;
}

export interface WelcomeDeckMotion {
  cards: readonly DeckCardMotion[];
  cardAt: (cardIndex: number) => DeckCardMotion;
  panHandlers: GestureResponderHandlers;
  dealTopCard: (direction: DealDirection) => void;
  setDeckWidth: (width: number) => void;
  /** Fades the dealt card in once it is drawn at the back. */
  revealDealtCard: () => void;
}

const DEAL_EASING = Easing.inOut(Easing.cubic);

function isSidewaysDrag(gesture: PanResponderGestureState): boolean {
  const horizontal = Math.abs(gesture.dx);
  return horizontal > WELCOME_DECK_DRAG_CLAIM_PX && horizontal > Math.abs(gesture.dy);
}

function releaseDirection(gesture: PanResponderGestureState): DealDirection | null {
  const isFarEnough = Math.abs(gesture.dx) > WELCOME_DECK_DEAL_DISTANCE_PX;
  const isFastEnough = Math.abs(gesture.vx) > WELCOME_DECK_DEAL_VELOCITY;
  if (!isFarEnough && !isFastEnough) {
    return null;
  }

  const travel = isFarEnough ? gesture.dx : gesture.vx;
  return travel < 0 ? -1 : 1;
}

function slideTo(value: Animated.Value, toValue: number, duration: number) {
  return Animated.timing(value, { toValue, duration, easing: DEAL_EASING, useNativeDriver: true });
}

/**
 * The deck's animated values and the rules that move them, kept outside React
 * so the gesture handlers always see the current top card.
 */
export function createWelcomeDeckMotion(
  contents: readonly DeckCardContent[],
  onTopIndexChange: (topIndex: number) => void,
): WelcomeDeckMotion {
  const cardCount = contents.length;
  let topIndex = 0;
  let deckWidth = 0;
  let isDealing = false;
  let dealtIndex: number | null = null;

  const cards: DeckCardMotion[] = contents.map((content, cardIndex) => ({
    content,
    slot: new Animated.Value(deckSlot(cardIndex, topIndex, cardCount)),
    presence: new Animated.Value(1),
    offsetX: new Animated.Value(0),
  }));

  function cardAt(cardIndex: number): DeckCardMotion {
    const card = cards[cardIndex];
    if (!card) {
      throw new Error(`The welcome deck has no card at ${cardIndex}`);
    }
    return card;
  }

  function moveCardsBehindUp(nextIndex: number): Animated.CompositeAnimation[] {
    return cards.flatMap((card, cardIndex) => {
      if (cardIndex === topIndex) {
        return [];
      }

      const toSlot = deckSlot(cardIndex, nextIndex, cardCount);
      return [slideTo(card.slot, toSlot, WELCOME_DECK_SETTLE_MS)];
    });
  }

  function dealTopCard(direction: DealDirection) {
    if (isDealing) {
      return;
    }

    isDealing = true;
    const leavingIndex = topIndex;
    const leaving = cardAt(leavingIndex);
    const nextIndex = nextTopIndex(topIndex, cardCount);
    const travel = direction * deckWidth * WELCOME_DECK_DEAL_TRAVEL;

    Animated.parallel([
      slideTo(leaving.offsetX, travel, WELCOME_DECK_DEAL_MS),
      slideTo(leaving.presence, 0, WELCOME_DECK_DEAL_MS),
      ...moveCardsBehindUp(nextIndex),
    ]).start(() => {
      leaving.slot.setValue(cardCount - 1);
      leaving.offsetX.setValue(0);
      dealtIndex = leavingIndex;
      topIndex = nextIndex;
      isDealing = false;
      onTopIndexChange(nextIndex);
    });
  }

  function revealDealtCard() {
    if (dealtIndex === null) {
      return;
    }

    slideTo(cardAt(dealtIndex).presence, 1, WELCOME_DECK_SETTLE_MS).start();
    dealtIndex = null;
  }

  function springBack() {
    Animated.spring(cardAt(topIndex).offsetX, { toValue: 0, useNativeDriver: true }).start();
  }

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => !isDealing && isSidewaysDrag(gesture),
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, gesture) => {
      cardAt(topIndex).offsetX.setValue(gesture.dx);
    },
    onPanResponderRelease: (_, gesture) => {
      const direction = releaseDirection(gesture);
      if (direction === null) {
        springBack();
        return;
      }

      dealTopCard(direction);
    },
    onPanResponderTerminate: springBack,
  });

  return {
    cards,
    cardAt,
    panHandlers: panResponder.panHandlers,
    dealTopCard,
    setDeckWidth: (width) => {
      deckWidth = width;
    },
    revealDealtCard,
  };
}
