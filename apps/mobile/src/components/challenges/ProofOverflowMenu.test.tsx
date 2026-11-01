import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ProofOverflowMenu, PROOF_OVERFLOW_NAV_OFFSET } from './ProofOverflowMenu';

describe('ProofOverflowMenu', () => {
  it('anchors under the nav and exposes the actions', () => {
    const onRemove = jest.fn();
    const onDismiss = jest.fn();

    render(
      <ProofOverflowMenu
        actions={[{ label: 'Remove', onPress: onRemove, testID: 'proof-remove', isDanger: true }]}
        onDismiss={onDismiss}
      />,
    );

    const root = screen.getByTestId('proof-overflow-menu');
    expect(StyleSheet.flatten(root.props.style)).toMatchObject({
      position: 'absolute',
      zIndex: 20,
    });

    const panelStyle = StyleSheet.flatten(screen.getByTestId('proof-overflow-panel').props.style);
    expect(panelStyle.position).toBe('absolute');
    expect(panelStyle.right).toBe(0);
    expect(panelStyle.top).toBeGreaterThanOrEqual(PROOF_OVERFLOW_NAV_OFFSET);

    fireEvent.press(screen.getByTestId('proof-remove'));
    expect(onRemove).toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('proof-overflow-scrim'));
    expect(onDismiss).toHaveBeenCalled();
  });
});
