import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { apiClient } from '@/lib/api';
import { MATCH_EMPTY_STEPS } from './match-copy';
import { MatchesListScreen } from './MatchesListScreen';

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    listMyMatches: jest.fn(),
  },
  apiQuery: {},
}));

jest.mock('expo-router', () => {
  const navigate = jest.fn();
  const setOptions = jest.fn();
  return {
    useRouter: () => ({ navigate }),
    useNavigation: () => ({ setOptions }),
  };
});

const mockedApi = apiClient as unknown as {
  listMyMatches: jest.Mock;
};

function renderList() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  function wrap(ui: ReactElement) {
    return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
  }

  const view = render(wrap(<MatchesListScreen />));
  return {
    cleanup: async () => {
      await waitFor(() => {
        expect(client.isFetching()).toBe(0);
      });
      view.unmount();
      client.clear();
    },
  };
}

describe('MatchesListScreen', () => {
  it('teaches the loop and offers create when the list is empty', async () => {
    mockedApi.listMyMatches.mockResolvedValue({ live: [], ended: [] });
    const { cleanup } = renderList();

    expect(await screen.findByTestId('matches-empty')).toBeOnTheScreen();
    expect(screen.getByTestId('matches-empty-create')).toBeOnTheScreen();
    for (const step of MATCH_EMPTY_STEPS) {
      expect(screen.getByText(step.title)).toBeOnTheScreen();
    }

    await cleanup();
  });

  // Groups run on whatever challenge the host picks, and that set grows past
  // push-ups. The front door must not promise one activity.
  it('names no activity in the empty state', async () => {
    mockedApi.listMyMatches.mockResolvedValue({ live: [], ended: [] });
    const { cleanup } = renderList();

    await screen.findByTestId('matches-empty');
    expect(screen.queryByText(/push-?ups/i)).toBeNull();

    await cleanup();
  });

  it('opens a live match from the list', async () => {
    mockedApi.listMyMatches.mockResolvedValue({
      live: [
        {
          id: 'm1',
          title: 'vs Bee',
          metric: 'pushups',
          scoringMode: 'best_single',
          endsAt: '2026-09-05T21:00:00.000Z',
          status: 'open',
          participantCount: 2,
          yourScore: 12,
          yourRank: 1,
        },
      ],
      ended: [],
    });
    const { cleanup } = renderList();

    expect(await screen.findByText('vs Bee')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('open-match-m1'));
    const { useNavigation, useRouter } = jest.requireMock('expo-router') as {
      useNavigation: () => { setOptions: jest.Mock };
      useRouter: () => { navigate: jest.Mock };
    };
    expect(useRouter().navigate).toHaveBeenCalledWith('/matches/m1');

    const headerRight = useNavigation().setOptions.mock.calls.at(-1)?.[0]
      ?.headerRight as () => ReactElement;
    const header = render(headerRight());
    fireEvent.press(header.getByTestId('matches-create'));
    expect(useRouter().navigate).toHaveBeenCalledWith('/matches/create');
    header.unmount();

    await cleanup();
  });
});
