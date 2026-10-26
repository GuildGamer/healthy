import { useRef } from 'react';
import {
  Animated,
  type GestureResponderHandlers,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  PanResponder,
} from 'react-native';

import { isSheetDismissal, isSheetPull } from './sheet-drag';

const SHEET_EXIT_OFFSET = 900;
const SHEET_EXIT_MS = 200;

interface SheetDragOptions {
  /** Omit while the sheet must stay, such as mid-save: dragging is then off. */
  onDismiss?: () => void;
  isReduceMotionEnabled: boolean;
}

interface SheetDrag {
  /** Added to the entry slide, so a pull moves the whole sheet. */
  dragY: Animated.Value;
  panHandlers: GestureResponderHandlers;
  /** On the sheet's scroll view: a pull only closes the sheet once its content is at the top. */
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

/**
 * Pull a sheet down to close it, as on any phone sheet. The gesture is taken
 * from the content only when it is scrolled to the top, so a long list still
 * scrolls back up before the sheet moves.
 */
export function useSheetDragToDismiss({
  onDismiss,
  isReduceMotionEnabled,
}: SheetDragOptions): SheetDrag {
  const dragY = useRef(new Animated.Value(0)).current;
  const scrollOffsetY = useRef(0);
  const latest = useRef({ onDismiss, isReduceMotionEnabled });
  latest.current = { onDismiss, isReduceMotionEnabled };

  function settle() {
    Animated.spring(dragY, { toValue: 0, bounciness: 0, useNativeDriver: true }).start();
  }

  function dismiss() {
    const close = latest.current.onDismiss;
    if (!close) {
      settle();
      return;
    }

    if (latest.current.isReduceMotionEnabled) {
      close();
      return;
    }

    Animated.timing(dragY, {
      toValue: SHEET_EXIT_OFFSET,
      duration: SHEET_EXIT_MS,
      useNativeDriver: true,
    }).start(() => close());
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_event, gesture) =>
        isSheetPull({
          dx: gesture.dx,
          dy: gesture.dy,
          scrollOffsetY: scrollOffsetY.current,
          canDismiss: Boolean(latest.current.onDismiss),
        }),
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_event, gesture) => dragY.setValue(Math.max(0, gesture.dy)),
      onPanResponderRelease: (_event, gesture) => {
        if (isSheetDismissal({ dy: gesture.dy, vy: gesture.vy })) {
          dismiss();
          return;
        }
        settle();
      },
      onPanResponderTerminate: () => settle(),
    }),
  ).current;

  return {
    dragY,
    panHandlers: panResponder.panHandlers,
    onScroll: (event) => {
      scrollOffsetY.current = event.nativeEvent.contentOffset.y;
    },
  };
}
