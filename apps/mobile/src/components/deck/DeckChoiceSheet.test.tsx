import { fireEvent, render as renderElement, screen } from '@testing-library/react-native';
import { type ReactElement } from 'react';
import { StyleSheet } from 'react-native';
import { type Metrics, SafeAreaProvider } from 'react-native-safe-area-context';
import { DeckChoiceSheet } from './DeckChoiceSheet';

const testSafeAreaMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function render(element: ReactElement) {
  return renderElement(
    <SafeAreaProvider initialMetrics={testSafeAreaMetrics}>{element}</SafeAreaProvider>,
  );
}

describe('DeckChoiceSheet', () => {
  it('separates options with a divider and keeps danger and Close wired', () => {
    const onVerify = jest.fn();
    const onCancelGroup = jest.fn();
    const onClose = jest.fn();

    render(
      <DeckChoiceSheet
        actions={[
          { label: 'Verify a clip', onPress: onVerify, testID: 'choice-verify' },
          {
            label: 'Cancel group',
            onPress: onCancelGroup,
            testID: 'choice-cancel-group',
            isDanger: true,
          },
        ]}
        onClose={onClose}
        testID="choice-sheet"
        visible
      />,
    );

    const verify = screen.getByTestId('choice-verify');
    const cancelGroup = screen.getByTestId('choice-cancel-group');
    const verifyStyle = StyleSheet.flatten(verify.props.style);
    const cancelStyle = StyleSheet.flatten(cancelGroup.props.style);

    expect(verifyStyle).toMatchObject({
      borderBottomWidth: StyleSheet.hairlineWidth,
    });
    expect(cancelStyle.borderBottomWidth ?? 0).toBe(0);

    expect(screen.getByText('Cancel group')).toHaveStyle({ color: expect.any(String) });
    const dangerColor = StyleSheet.flatten(screen.getByText('Cancel group').props.style).color;
    const verifyColor = StyleSheet.flatten(screen.getByText('Verify a clip').props.style).color;
    expect(dangerColor).not.toBe(verifyColor);

    fireEvent.press(screen.getByTestId('choice-sheet-close'));
    expect(onClose).toHaveBeenCalled();

    fireEvent.press(cancelGroup);
    expect(onCancelGroup).toHaveBeenCalled();
  });
});
