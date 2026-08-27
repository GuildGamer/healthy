import { render, screen } from '@testing-library/react-native';
import { HomeScreen } from './HomeScreen';

jest.mock('@product/brand', () => ({
  colors: {
    background: '#0B1220',
    surface: '#121A2B',
    text: '#F4F7FB',
    muted: '#9AA8BF',
    accent: '#3DDC97',
    danger: '#FF6B6B',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 },
}));

jest.mock('@product/client', () => ({
  createApiClient: jest.fn(() => ({
    health: jest.fn(),
  })),
}));

describe('HomeScreen', () => {
  it('renders home screen title and health action', () => {
    render(<HomeScreen />);

    expect(screen.getByText('Product')).toBeOnTheScreen();
    expect(screen.getByText('Mobile home')).toBeOnTheScreen();
    expect(screen.getByText('Check API health')).toBeOnTheScreen();
  });
});
