import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Animated, PanResponder, type GestureResponderHandlers } from 'react-native';

/** A drag past this share of the card's width deals the next one. */
const SWIPE_DISTANCE_RATIO = 0.25;
const SWIPE_VELOCITY = 0.5;
/** Below this, a touch is still a tap on the card or its button. */
const DRAG_SLOP = 12;
const DEAL_DURATION_MS = 220;
/**
 * The resting stack is drawn from this value, so it has to read the same on
 * both sides of the bridge after every deal. A natively driven value can be
 * left at its last frame when the cards re-render, which hid the card behind.
 */
const USE_NATIVE_DRIVER = false;

type DealDirection = 'forward' | 'back';

interface DeckSwipeOptions {
  count: number;
  cardWidth: number;
  isReduceMotionEnabled: boolean;
  /** Called whenever the top card changes, by gesture or by an assistive action. */
  onDeal: () => void;
  /** A card to put on top without dealing through the ones before it. */
  focusIndex?: number | null;
}

interface DeckSwipe {
  activeIndex: number;
  translateX: Animated.Value;
  panHandlers: GestureResponderHandlers;
  dealNext: () => void;
  dealPrevious: () => void;
}

/**
 * Sideways through the deck without reordering it: the top card slides aside
 * to show the next, or a right swipe brings the last one back.
 */
export function useDeckSwipe({
  count,
  cardWidth,
  isReduceMotionEnabled,
  onDeal,
  focusIndex = null,
}: DeckSwipeOptions): DeckSwipe {
  const [index, setIndex] = useState(focusIndex ?? 0);
  const translateX = useRef(new Animated.Value(0)).current;
  const pendingEntry = useRef<DealDirection | null>(null);
  const activeIndex = Math.min(index, Math.max(count - 1, 0));
  const offscreen = Math.max(cardWidth, 1) * 1.2;

  useLayoutEffect(() => {
    const entry = pendingEntry.current;
    pendingEntry.current = null;

    if (entry !== 'back' || isReduceMotionEnabled) {
      translateX.setValue(0);
      return;
    }

    translateX.setValue(-offscreen);
    Animated.timing(translateX, {
      toValue: 0,
      duration: DEAL_DURATION_MS,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [activeIndex, isReduceMotionEnabled, offscreen, translateX]);

  useEffect(() => {
    if (focusIndex === null) {
      return;
    }

    translateX.setValue(0);
    setIndex(focusIndex);
  }, [focusIndex, translateX]);

  function settle() {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: USE_NATIVE_DRIVER }).start();
  }

  function deal(direction: DealDirection) {
    const nextIndex = direction === 'forward' ? activeIndex + 1 : activeIndex - 1;
    if (nextIndex < 0 || nextIndex >= count) {
      settle();
      return;
    }

    onDeal();
    pendingEntry.current = direction;

    if (isReduceMotionEnabled || direction === 'back') {
      setIndex(nextIndex);
      return;
    }

    Animated.timing(translateX, {
      toValue: -offscreen,
      duration: DEAL_DURATION_MS,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start(() => setIndex(nextIndex));
  }

  const latest = useRef({ deal, settle, cardWidth });
  latest.current = { deal, settle, cardWidth };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dx) > DRAG_SLOP && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_event, gesture) => translateX.setValue(gesture.dx),
      onPanResponderRelease: (_event, gesture) => {
        const threshold = latest.current.cardWidth * SWIPE_DISTANCE_RATIO;
        if (gesture.dx < -threshold || gesture.vx < -SWIPE_VELOCITY) {
          latest.current.deal('forward');
          return;
        }

        if (gesture.dx > threshold || gesture.vx > SWIPE_VELOCITY) {
          latest.current.deal('back');
          return;
        }

        latest.current.settle();
      },
      onPanResponderTerminate: () => latest.current.settle(),
    }),
  ).current;

  return {
    activeIndex,
    translateX,
    panHandlers: panResponder.panHandlers,
    dealNext: () => deal('forward'),
    dealPrevious: () => deal('back'),
  };
}
