import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { CategorySelectionScreen } from './CategorySelectionScreen';

describe('CategorySelectionScreen', () => {
  it('keeps Continue off until a row is picked, then sends those ids', async () => {
    const onContinue = jest.fn();

    render(<CategorySelectionScreen onContinue={onContinue} />);

    expect(screen.getByTestId('category-continue')).toBeDisabled();

    fireEvent.press(screen.getByTestId('category-hypertension'));
    fireEvent.press(screen.getByTestId('category-general'));

    expect(screen.getByText('Continue · 2 selected')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('category-continue'));

    await waitFor(() => {
      expect(onContinue).toHaveBeenCalledWith(['hypertension', 'general']);
    });
  });
});
