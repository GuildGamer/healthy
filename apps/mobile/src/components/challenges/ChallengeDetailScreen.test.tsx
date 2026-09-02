import type { CatalogChallenge, TodayChallenge } from '@product/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { apiClient } from '@/lib/api';
import { ChallengeDetailScreen } from './ChallengeDetailScreen';

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    listChallengeCatalog: jest.fn(),
    listTodayChallenges: jest.fn(),
    listChallengeHistory: jest.fn(),
    setChallengeEnrollment: jest.fn(),
    addChallengeReminder: jest.fn(),
    removeChallengeReminder: jest.fn(),
  },
  apiQuery: {},
}));

jest.mock('expo-router', () => {
  const push = jest.fn();
  const back = jest.fn();
  return {
    useRouter: () => ({ push, back }),
  };
});

const mockedApi = apiClient as unknown as {
  listChallengeCatalog: jest.Mock;
  listTodayChallenges: jest.Mock;
  listChallengeHistory: jest.Mock;
  setChallengeEnrollment: jest.Mock;
};

function catalogChallenge(
  overrides: Partial<CatalogChallenge> = {},
): CatalogChallenge {
  return {
    challengeId: 'c1',
    slug: 'walk',
    title: 'Walk 20 minutes',
    description: 'A brisk walk after lunch.',
    category: 'general',
    rewardPoints: 20,
    frequency: 'daily',
    completionKind: 'check_in',
    instruction: 'A brisk walk after lunch.',
    icon: 'walk',
    isEnrolled: true,
    requiresMembership: false,
    isLocked: false,
    reminders: [],
    capture: {
      kind: 'self_report',
      metric: null,
      target: { durationMinutes: null, distanceMeters: null, count: null },
    },
    ...overrides,
  };
}

function todayChallenge(overrides: Partial<TodayChallenge> = {}): TodayChallenge {
  return {
    id: 'uc1',
    challengeId: 'c1',
    title: 'Walk 20 minutes',
    description: 'A brisk walk after lunch.',
    category: 'general',
    rewardPoints: 20,
    status: 'completed',
    frequency: 'daily',
    completionKind: 'check_in',
    instruction: 'A brisk walk after lunch.',
    icon: 'walk',
    periodKey: '2026-08-30',
    evidenceRequest: null,
    draft: null,
    progress: { filled: 1, required: 1 },
    capture: {
      kind: 'self_report',
      metric: null,
      target: { durationMinutes: null, distanceMeters: null, count: null },
    },
    ...overrides,
  };
}

function renderDetail() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  const view = render(
    <QueryClientProvider client={client}>
      <ChallengeDetailScreen challengeId="c1" />
    </QueryClientProvider>,
  );

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

beforeEach(() => {
  jest.clearAllMocks();
  mockedApi.listChallengeCatalog.mockResolvedValue({
    challenges: [catalogChallenge()],
    enrolledCount: 1,
    hasMembership: false,
    maxRemindersPerChallenge: 1,
  });
  mockedApi.listTodayChallenges.mockResolvedValue({
    dayKey: '2026-08-30',
    challenges: [todayChallenge()],
    completedCount: 1,
    totalCount: 1,
  });
  mockedApi.listChallengeHistory.mockResolvedValue({
    challengeId: 'c1',
    entries: [],
  });
});

async function openHistoryTab() {
  await screen.findByTestId('challenge-detail-tabs');
  fireEvent.press(screen.getByTestId('challenge-detail-tab-history'));
}

describe('ChallengeDetailScreen history', () => {
  it('shows today’s completed challenge on the history tab', async () => {
    const { cleanup } = renderDetail();

    await openHistoryTab();

    expect(await screen.findByTestId('challenge-history-list')).toBeOnTheScreen();
    expect(screen.getByTestId('challenge-history-uc1')).toBeOnTheScreen();
    expect(screen.getByText('Checked in')).toBeOnTheScreen();
    expect(screen.getByText('+20')).toBeOnTheScreen();

    await cleanup();
  });

  it('keeps history off the details tab', async () => {
    const { cleanup } = renderDetail();

    expect(await screen.findByTestId('challenge-detail-tabs')).toBeOnTheScreen();
    expect(screen.getByText('How often')).toBeOnTheScreen();
    expect(screen.queryByTestId('challenge-history-empty')).toBeNull();

    await cleanup();
  });

  it('invites the first completion when the list is empty', async () => {
    mockedApi.listTodayChallenges.mockResolvedValue({
      dayKey: '2026-08-30',
      challenges: [todayChallenge({ status: 'pending' })],
      completedCount: 0,
      totalCount: 1,
    });

    const { cleanup } = renderDetail();

    await openHistoryTab();

    expect(await screen.findByTestId('challenge-history-empty')).toBeOnTheScreen();
    expect(screen.queryByText('How often')).toBeNull();
    expect(mockedApi.listChallengeHistory).toHaveBeenCalledWith({
      challengeId: 'c1',
    });

    await cleanup();
  });

  it('lists a past completion with what was logged and the points', async () => {
    mockedApi.listChallengeHistory.mockResolvedValue({
      challengeId: 'c1',
      entries: [
        {
          id: 'uc1',
          periodKey: '2026-08-30',
          completedAt: '2026-08-30T12:00:00.000Z',
          outcome: 'rewarded',
          pointsDelta: 20,
          log: { kind: 'check_in' },
          evidence: null,
        },
      ],
    });

    const { cleanup } = renderDetail();

    await openHistoryTab();

    expect(await screen.findByTestId('challenge-history-list')).toBeOnTheScreen();
    expect(screen.getByTestId('challenge-history-uc1')).toBeOnTheScreen();
    expect(screen.getByText('Checked in')).toBeOnTheScreen();
    expect(screen.getByText('30 Aug')).toBeOnTheScreen();
    expect(screen.getByText('+20')).toBeOnTheScreen();

    await cleanup();
  });

  it('names a skipped photo check on a penalty row', async () => {
    mockedApi.listChallengeHistory.mockResolvedValue({
      challengeId: 'c1',
      entries: [
        {
          id: 'h2',
          periodKey: '2026-08-29',
          completedAt: '2026-08-29T12:00:00.000Z',
          outcome: 'penalized',
          pointsDelta: -25,
          log: { kind: 'check_in' },
          evidence: 'skipped',
        },
      ],
    });

    const { cleanup } = renderDetail();

    await openHistoryTab();

    expect(await screen.findByText(/Photo skipped/)).toBeOnTheScreen();
    expect(screen.getByText('-25')).toBeOnTheScreen();

    await cleanup();
  });
});

describe('ChallengeDetailScreen push-up target', () => {
  it('lets the member change the count and save it', async () => {
    mockedApi.listChallengeCatalog.mockResolvedValue({
      challenges: [
        catalogChallenge({
          title: 'Do twenty push-ups',
          capture: {
            kind: 'device_session',
            metric: 'pushups',
            target: { durationMinutes: null, distanceMeters: null, count: 20 },
          },
        }),
      ],
      enrolledCount: 1,
      hasMembership: false,
      maxRemindersPerChallenge: 1,
    });
    mockedApi.setChallengeEnrollment.mockResolvedValue({
      challenges: [],
      enrolledCount: 1,
      hasMembership: false,
      maxRemindersPerChallenge: 1,
    });

    const { cleanup } = renderDetail();

    expect(await screen.findByTestId('detail-pushup-target-value')).toHaveTextContent(
      '20',
    );

    fireEvent.press(screen.getByTestId('detail-pushup-target-dec'));
    expect(screen.getByTestId('detail-pushup-target-value')).toHaveTextContent('19');

    fireEvent.press(screen.getByTestId('challenge-detail-save'));

    await waitFor(() => {
      expect(mockedApi.setChallengeEnrollment).toHaveBeenCalledWith({
        challengeId: 'c1',
        isEnrolled: true,
        frequency: 'daily',
        targetCount: 19,
      });
    });

    await cleanup();
  });
});
