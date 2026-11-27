import { fireEvent, screen } from '@testing-library/react-native';
import { apiClient } from '@/lib/api';
import { MatchesListScreen } from './MatchesListScreen';
import { listItem, renderWithClient } from './testing/match-fixtures';

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: { listMyMatches: jest.fn() },
  apiQuery: {},
}));

const mockNavigate = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ navigate: mockNavigate, push: mockPush }),
}));

const mockedApi = apiClient as unknown as { listMyMatches: jest.Mock };

describe('MatchesListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows who has done today in each live group, and your place', async () => {
    mockedApi.listMyMatches.mockResolvedValue({ live: [listItem()], ended: [] });
    const view = renderWithClient(<MatchesListScreen />);

    expect(await screen.findByText('You, Ada, Tunde')).toBeOnTheScreen();
    expect(screen.getByText('2 of 3 today')).toBeOnTheScreen();
    expect(screen.getByText('2nd')).toBeOnTheScreen();
    expect(screen.getByTestId('match-faces-m1-tunde')).toBeOnTheScreen();
    expect(screen.getByTestId('matches-verify-clip')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('open-match-m1'));
    expect(mockNavigate).toHaveBeenCalledWith('/matches/m1');
    fireEvent.press(screen.getByTestId('matches-verify-clip'));
    expect(mockPush).toHaveBeenCalledWith('/v/new');
    await view.cleanup();
  });

  it('folds ended groups into one Past groups row', async () => {
    mockedApi.listMyMatches.mockResolvedValue({
      live: [listItem()],
      ended: [listItem({ id: 'old', status: 'completed', yourRank: 1 })],
    });
    const view = renderWithClient(<MatchesListScreen />);

    expect(await screen.findByText('1 ended · you won 1')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('matches-past'));
    expect(mockNavigate).toHaveBeenCalledWith('/matches/past');
    await view.cleanup();
  });

  it('teaches the loop when there is nothing live', async () => {
    mockedApi.listMyMatches.mockResolvedValue({ live: [], ended: [] });
    const view = renderWithClient(<MatchesListScreen />);

    expect(await screen.findByText('Challenge your friends.')).toBeOnTheScreen();
    expect(screen.getByTestId('matches-verify-clip')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('matches-empty-create'));
    expect(mockNavigate).toHaveBeenCalledWith('/matches/create');
    await view.cleanup();
  });

  it('offers one Try again when the list does not load', async () => {
    mockedApi.listMyMatches.mockRejectedValueOnce(new Error('offline'));
    const view = renderWithClient(<MatchesListScreen />);

    expect(await screen.findByText('Your groups didn’t load.')).toBeOnTheScreen();
    mockedApi.listMyMatches.mockResolvedValue({ live: [], ended: [] });
    fireEvent.press(screen.getByTestId('matches-retry'));
    expect(await screen.findByTestId('matches-empty')).toBeOnTheScreen();
    await view.cleanup();
  });
});
