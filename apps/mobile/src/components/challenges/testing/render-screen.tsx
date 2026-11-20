import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { type Metrics, SafeAreaProvider } from 'react-native-safe-area-context';

/** `useSafeAreaInsets` throws without a provider, and native metrics are async. */
const TEST_SAFE_AREA: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** Renders a screen with fresh queries, and waits for them to settle before the test ends. */
export function renderScreen(ui: ReactElement) {
  // A default mutation `gcTime` leaves a five minute timer that keeps Jest alive.
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });

  const view = render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA}>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </SafeAreaProvider>,
  );

  return {
    ...view,
    settle: () => waitFor(() => expect(client.isFetching() + client.isMutating()).toBe(0)),
  };
}
