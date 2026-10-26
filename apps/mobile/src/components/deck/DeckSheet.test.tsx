import { fireEvent, render as renderElement, screen } from '@testing-library/react-native';
import { type ReactElement, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { type Metrics, SafeAreaProvider } from 'react-native-safe-area-context';
import { DeckSheet } from './DeckSheet';
import { DeckSheetFooter } from './DeckSheetFooter';

const testSafeAreaMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function render(element: ReactElement) {
  return renderElement(
    <SafeAreaProvider initialMetrics={testSafeAreaMetrics}>{element}</SafeAreaProvider>,
  );
}

function CountingBody() {
  const [count, setCount] = useState(0);
  return (
    <>
      <Text>Rows</Text>
      <DeckSheetFooter>
        <Pressable onPress={() => setCount(count + 1)} testID="pinned-action">
          <Text>{`Pressed ${count}`}</Text>
        </Pressable>
      </DeckSheetFooter>
    </>
  );
}

describe('DeckSheet', () => {
  it('pins an action written deep in the content under the scroll, not inside it', () => {
    render(
      <DeckSheet onDismiss={jest.fn()}>
        <CountingBody />
      </DeckSheet>,
    );

    const footer = screen.getByTestId('deck-sheet-footer');
    expect(footer).toContainElement(screen.getByTestId('pinned-action'));
    expect(screen.getByTestId('deck-sheet-content')).not.toContainElement(
      screen.getByTestId('pinned-action'),
    );
  });

  it('keeps the pinned action wired to the content’s latest state', () => {
    render(
      <DeckSheet onDismiss={jest.fn()}>
        <CountingBody />
      </DeckSheet>,
    );

    fireEvent.press(screen.getByTestId('pinned-action'));
    fireEvent.press(screen.getByTestId('pinned-action'));

    expect(screen.getByText('Pressed 2')).toBeOnTheScreen();
  });

  it('pins the footer prop under the scroll as well', () => {
    render(
      <DeckSheet footer={<Text>Done</Text>} onDismiss={jest.fn()}>
        <Text>Rows</Text>
      </DeckSheet>,
    );

    expect(screen.getByTestId('deck-sheet-content')).not.toContainElement(screen.getByText('Done'));
  });

  it('renders a footer in place when it is not inside a sheet', () => {
    render(
      <DeckSheetFooter>
        <Text>Save</Text>
      </DeckSheetFooter>,
    );

    expect(screen.getByText('Save')).toBeOnTheScreen();
  });

  it('keeps the title in the fixed header, not inside the scroll', () => {
    render(
      <DeckSheet onDismiss={jest.fn()} title="How you win">
        <Text>Rows</Text>
      </DeckSheet>,
    );

    const header = screen.getByTestId('deck-sheet-header');
    expect(header).toContainElement(screen.getByText('How you win'));
    expect(screen.getByTestId('deck-sheet-content')).not.toContainElement(
      screen.getByText('How you win'),
    );
  });

  it('still renders a drag header when there is no title', () => {
    render(
      <DeckSheet onDismiss={jest.fn()}>
        <Text>Rows</Text>
      </DeckSheet>,
    );

    expect(screen.getByTestId('deck-sheet-header')).toBeOnTheScreen();
  });
});
