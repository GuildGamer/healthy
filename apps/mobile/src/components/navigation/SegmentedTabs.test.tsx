import { fireEvent, render, screen } from '@testing-library/react-native';
import { SegmentedTabs } from './SegmentedTabs';

const OPTIONS = [
  { id: 'mine', label: 'Mine' },
  { id: 'groups', label: 'Groups' },
] as const;

describe('SegmentedTabs', () => {
  it('marks only the selected tab as selected', () => {
    render(
      <SegmentedTabs
        onSelect={jest.fn()}
        options={OPTIONS}
        selected="mine"
        testID="challenges-segment"
      />,
    );

    expect(screen.getByTestId('challenges-segment-mine').props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(screen.getByTestId('challenges-segment-groups').props.accessibilityState).toMatchObject({
      selected: false,
    });
  });

  it('reports the tab the user picked', () => {
    const onSelect = jest.fn();
    render(
      <SegmentedTabs
        onSelect={onSelect}
        options={OPTIONS}
        selected="mine"
        testID="challenges-segment"
      />,
    );

    fireEvent.press(screen.getByTestId('challenges-segment-groups'));

    expect(onSelect).toHaveBeenCalledWith('groups');
  });
});
