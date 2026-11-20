import { useRef } from 'react';
import { Animated, type GestureResponderHandlers, PanResponder } from 'react-native';

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
  /** On the sheet's fixed header, so the scroll view never races the pull. */
  panHandlers: GestureResponderHandlers;
}

/**
 * Pull a sheet down to close it, as on any phone sheet. The gesture lives on
 * the fixed header above the scroll, so a long list still scrolls on its own.
 */
export function useSheetDragToDismiss({
  onDismiss,
  isReduceMotionEnabled,
}: SheetDragOptions): SheetDrag {
  const dragY = useRef(new Animated.Value(0)).current;
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
      onStartShouldSetPanResponder: () => Boolean(latest.current.onDismiss),
      onMoveShouldSetPanResponder: (_event, gesture) =>
        isSheetPull({
          dx: gesture.dx,
          dy: gesture.dy,
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
  };
}
