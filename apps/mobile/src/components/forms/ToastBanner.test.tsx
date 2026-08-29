import { render, screen } from '@testing-library/react-native';
import { ToastBanner } from './ToastBanner';

describe('ToastBanner', () => {
  it('renders one line of copy', () => {
    render(<ToastBanner message="Photo accepted · +200 points" tone="success" />);

    expect(screen.getByText('Photo accepted · +200 points')).toBeOnTheScreen();
  });
});
