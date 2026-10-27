import type { MeOutput } from '@product/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';

const TEST_SAFE_AREA: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export function meFixture(overrides: Partial<MeOutput> = {}): MeOutput {
  return {
    id: 'u1',
    email: 'nurul@example.com',
    name: 'Nurul Masih',
    categories: ['hypertension', 'general'],
    pointsBalance: 4_350,
    currentStreakDays: 6,
    streakLapsedYesterday: false,
    bestStreakDays: 12,
    timeZone: 'Africa/Lagos',
    countryCode: 'NG',
    displayName: 'Nurul',
    reminderEnabled: true,
    reminderMinute: 1_140,
    evidenceRemindersEnabled: true,
    promotionalMessagesEnabled: false,
    showOnLeaderboard: true,
    groupNotificationsEnabled: true,
    inProgressNudgeEnabled: true,
    inProgressNudgeDelayMinutes: 30,
    healthLinkStatus: 'connected',
    hasMembership: false,
    maxRemindersPerChallenge: 1,
    proofClipAudience: null,
    ...overrides,
  };
}

export function renderWithProviders(element: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <SafeAreaProvider initialMetrics={TEST_SAFE_AREA}>{element}</SafeAreaProvider>
    </QueryClientProvider>,
  );
}
