import { render, screen } from '@testing-library/react-native';
import { HomeScreen } from './HomeScreen';

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    health: jest.fn(),
  },
  apiQuery: {},
}));

describe('HomeScreen', () => {
  it('renders home screen title and health action', () => {
    render(<HomeScreen />);

    expect(screen.getByText('Product')).toBeOnTheScreen();
    expect(screen.getByText('Mobile home')).toBeOnTheScreen();
    expect(screen.getByText('Check API health')).toBeOnTheScreen();
  });
});
