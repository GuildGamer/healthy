import type { ReactNode } from 'react';
import { Modal } from 'react-native';
import { DeckSheet } from './DeckSheet';

interface DeckSheetModalProps {
  visible: boolean;
  /** Back, or a tap on the dimmed page; omit while the sheet must stay, such as mid-save. */
  onDismiss?: () => void;
  children: ReactNode;
  /** Pinned under the content, so it stays reachable when a long list scrolls. */
  footer?: ReactNode;
  /** Fixed above the scroll, so a pull on the title closes the sheet. */
  title?: string;
  testID?: string;
}

/** A deck sheet over the screen it was opened from, for a choice that has no route of its own. */
export function DeckSheetModal({
  visible,
  onDismiss,
  children,
  footer,
  title,
  testID,
}: DeckSheetModalProps) {
  return (
    <Modal
      animationType="none"
      onRequestClose={() => onDismiss?.()}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <DeckSheet footer={footer} onDismiss={onDismiss} testID={testID} title={title}>
        {children}
      </DeckSheet>
    </Modal>
  );
}
