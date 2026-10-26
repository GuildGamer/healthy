import {
  createContext,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from 'react';

interface FooterSlot {
  read: () => ReactNode;
  write: (node: ReactNode) => void;
  subscribe: (onChange: () => void) => () => void;
}

const FooterSlotContext = createContext<FooterSlot | null>(null);

function createFooterSlot(): FooterSlot {
  let current: ReactNode = null;
  const listeners = new Set<() => void>();
  return {
    read: () => current,
    write: (node) => {
      current = node;
      listeners.forEach((onChange) => onChange());
    },
    subscribe: (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
  };
}

/** One slot per sheet, so a footer written deep in its content lands under its own scroll. */
export function useFooterSlot(): FooterSlot {
  const slot = useRef<FooterSlot | null>(null);
  slot.current ??= createFooterSlot();
  return slot.current;
}

export const FooterSlotProvider = FooterSlotContext.Provider;

/** Draws whatever the sheet's content put in the slot; null while it is empty. */
export function FooterSlotOutlet({
  slot,
  wrap,
}: {
  slot: FooterSlot;
  wrap: (footer: ReactNode) => ReactNode;
}) {
  const footer = useSyncExternalStore(slot.subscribe, slot.read);
  return footer ? wrap(footer) : null;
}

/**
 * The sheet's action, pinned under its scrolling content so it is in view
 * however long the content runs. Written from wherever the action's state
 * lives; outside a sheet it simply renders in place.
 */
export function DeckSheetFooter({ children }: { children: ReactNode }) {
  const slot = useContext(FooterSlotContext);

  // Rewritten on every render, so the pinned action always calls the latest handlers.
  useLayoutEffect(() => {
    slot?.write(children);
  });
  useLayoutEffect(() => () => slot?.write(null), [slot]);

  return slot ? null : children;
}
