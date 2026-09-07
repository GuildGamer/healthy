import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { apiClient } from '@/lib/api';
import { MatchesListScreen } from './MatchesListScreen';

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    listMyMatches: jest.fn(),
  },
  apiQuery: {},
}));

jest.mock('expo-router', () => {
  const push = jest.fn();
  const setOptions = jest.fn();
  return {
    useRouter: () => ({ push }),
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
  it('offers create when the list is empty', async () => {
    mockedApi.listMyMatches.mockResolvedValue({ live: [], ended: [] });
    const { cleanup } = renderList();

    expect(await screen.findByTestId('matches-empty')).toBeOnTheScreen();
    expect(screen.getByTestId('matches-empty-create')).toBeOnTheScreen();

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
          yourBestCount: 12,
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
      useRouter: () => { push: jest.Mock };
    };
    expect(useRouter().push).toHaveBeenCalledWith('/matches/m1');

    const headerRight = useNavigation().setOptions.mock.calls.at(-1)?.[0]
      ?.headerRight as () => ReactElement;
    const header = render(headerRight());
    fireEvent.press(header.getByTestId('matches-create'));
    expect(useRouter().push).toHaveBeenCalledWith('/matches/create');
    header.unmount();

    await cleanup();
  });
});
