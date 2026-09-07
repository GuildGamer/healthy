import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Metrics } from 'react-native-safe-area-context';
import { apiClient } from '@/lib/api';
import { MatchCreateScreen } from './MatchCreateScreen';

const testSafeAreaMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    createMatch: jest.fn(),
  },
  apiQuery: {},
}));

jest.mock('expo-router', () => {
  const replace = jest.fn();
  return {
    useRouter: () => ({ replace }),
  };
});

const mockedApi = apiClient as unknown as {
  createMatch: jest.Mock;
};

describe('MatchCreateScreen', () => {
  it('creates a today match and shares the invite link', async () => {
    mockedApi.createMatch.mockResolvedValue({
      match: { id: 'm1' },
      invite: { token: 'tok', url: 'healthy://match/tok' },
    });
    const share = jest.spyOn(Share, 'share').mockResolvedValue({
      action: Share.sharedAction,
    });

    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false, gcTime: 0 },
      },
    });

    render(
      <QueryClientProvider client={client}>
        <SafeAreaProvider initialMetrics={testSafeAreaMetrics}>
          <MatchCreateScreen />
        </SafeAreaProvider>
      </QueryClientProvider>,
    );

    fireEvent.press(screen.getByTestId('match-create-submit'));

    await waitFor(() => {
      expect(mockedApi.createMatch).toHaveBeenCalledWith({ window: 'today' });
    });
    expect(share).toHaveBeenCalledWith({
      message: 'healthy://match/tok',
      url: 'healthy://match/tok',
    });

    client.clear();
    share.mockRestore();
  });
});
