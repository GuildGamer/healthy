import type { ChallengeHistoryEntry } from '@product/client';
import { fireEvent, screen } from '@testing-library/react-native';
import { todayDetails } from '@/components/home/testing/today-fixtures';
import { apiClient } from '@/lib/api';
import { ChallengeHistoryEntryScreen } from './ChallengeHistoryEntryScreen';
import { ChallengeHistoryScreen } from './ChallengeHistoryScreen';
import { catalogChallenge, catalogOutput, WALK_TEN } from './testing/catalog-fixtures';
import { renderScreen } from './testing/render-screen';

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    listChallengeCatalog: jest.fn(),
    listTodayChallenges: jest.fn(),
    getTodayDetails: jest.fn(),
    listChallengeHistory: jest.fn(),
  },
  apiQuery: {},
}));

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: (href: unknown) => mockPush(href) }),
  router: { canDismiss: () => true, dismiss: jest.fn(), replace: jest.fn() },
}));

const mockedApi = apiClient as unknown as {
  listChallengeCatalog: jest.Mock;
  listTodayChallenges: jest.Mock;
  getTodayDetails: jest.Mock;
  listChallengeHistory: jest.Mock;
};

function entry(
  overrides: Partial<ChallengeHistoryEntry> & Pick<ChallengeHistoryEntry, 'id' | 'log'>,
): ChallengeHistoryEntry {
  return {
    periodKey: '2026-10-20',
    completedAt: '2026-10-20T09:15:00.000Z',
    outcome: 'rewarded',
    pointsDelta: 150,
    evidence: null,
    proofClip: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedApi.listTodayChallenges.mockResolvedValue({
    dayKey: '2026-10-22',
    challenges: [],
    completedCount: 0,
    totalCount: 0,
  });
  mockedApi.getTodayDetails.mockResolvedValue(todayDetails([]));
});

describe('ChallengeHistoryScreen', () => {
  it('offers the share card from the finish’s page, without the distance', async () => {
    mockedApi.listChallengeCatalog.mockResolvedValue(
      catalogOutput([
        catalogChallenge({
          challengeId: 'walk',
          title: 'Morning walk',
          isEnrolled: true,
          capture: WALK_TEN,
        }),
      ]),
    );
    mockedApi.listChallengeHistory.mockResolvedValue({
      challengeId: 'walk',
      entries: [
        entry({
          id: 'uc-walk',
          log: {
            kind: 'device',
            metric: 'walk',
            durationSeconds: 1200,
            distanceMeters: 1600,
            count: null,
          },
        }),
      ],
    });

    const view = renderScreen(<ChallengeHistoryEntryScreen challengeId="walk" entryId="uc-walk" />);
    expect(await screen.findByTestId('activity-detail-amount')).toHaveTextContent('20 min walk');
    fireEvent.press(screen.getByTestId('activity-detail-share-card'));

    const route: unknown = mockPush.mock.calls.at(-1)?.[0];
    expect(route).toEqual({
      pathname: '/challenge/share',
      params: {
        kind: 'walk',
        label: 'Morning walk',
        value: '20',
        unit: 'minutes walked',
        when: '2026-10-20T09:15:00.000Z',
        friend: 'walk',
        userChallengeId: 'uc-walk',
      },
    });
    expect(JSON.stringify(route)).not.toContain('1600');
    await view.settle();
  });

  it('offers a logged card for a reading and leaves the numbers off it', async () => {
    mockedApi.listChallengeCatalog.mockResolvedValue(
      catalogOutput([
        catalogChallenge({
          challengeId: 'bp',
          title: 'Check your blood pressure',
          category: 'hypertension',
          completionKind: 'vitals_bp',
          isEnrolled: true,
        }),
      ]),
    );
    mockedApi.listChallengeHistory.mockResolvedValue({
      challengeId: 'bp',
      entries: [
        entry({
          id: 'uc-bp',
          log: {
            kind: 'vitals_bp',
            systolic: 128,
            diastolic: 82,
            pulse: 70,
            notes: 'With Sam',
          },
        }),
      ],
    });

    const view = renderScreen(<ChallengeHistoryEntryScreen challengeId="bp" entryId="uc-bp" />);
    fireEvent.press(await screen.findByTestId('activity-detail-share-card'));

    const route: unknown = mockPush.mock.calls.at(-1)?.[0];
    expect(route).toMatchObject({
      pathname: '/challenge/share',
      params: {
        kind: 'bloodPressure',
        label: 'Check your blood pressure',
        value: 'Logged',
        unit: '20 Oct',
        friend: 'day',
        userChallengeId: 'uc-bp',
      },
    });
    expect(JSON.stringify(route)).not.toMatch(/128|82|70|Sam/);
    await view.settle();
  });

  it('opens a finish on its own page and marks the one that was filmed', async () => {
    mockedApi.listChallengeCatalog.mockResolvedValue(
      catalogOutput([catalogChallenge({ challengeId: 'push', isEnrolled: true })]),
    );
    mockedApi.listChallengeHistory.mockResolvedValue({
      challengeId: 'push',
      entries: [
        entry({
          id: 'uc-filmed',
          log: {
            kind: 'device',
            metric: 'pushups',
            durationSeconds: null,
            distanceMeters: null,
            count: 20,
          },
          proofClip: {
            id: 'clip-1',
            displayCode: 'H7K-29Q',
            status: 'ready',
            visibility: 'shared',
          },
        }),
        entry({
          id: 'uc-plain',
          completedAt: '2026-10-19T09:15:00.000Z',
          periodKey: '2026-10-19',
          log: {
            kind: 'device',
            metric: 'pushups',
            durationSeconds: null,
            distanceMeters: null,
            count: 20,
          },
        }),
      ],
    });

    const view = renderScreen(<ChallengeHistoryScreen challengeId="push" />);
    expect(await screen.findByTestId('challenge-history-proof-uc-filmed')).toBeOnTheScreen();
    expect(screen.queryByTestId('challenge-history-proof-uc-plain')).toBeNull();

    fireEvent.press(screen.getByTestId('challenge-history-uc-filmed'));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/challenge/[challengeId]/history/[entryId]',
      params: { challengeId: 'push', entryId: 'uc-filmed' },
    });
    await view.settle();
  });
});
