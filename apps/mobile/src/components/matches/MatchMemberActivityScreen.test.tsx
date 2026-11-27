import { fireEvent, screen } from '@testing-library/react-native';
import { apiClient } from '@/lib/api';
import { MatchMemberActivityScreen } from './MatchMemberActivityScreen';
import { liveBoard, renderWithClient } from './testing/match-fixtures';

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    getMatch: jest.fn(),
    listMatchMemberActivity: jest.fn(),
  },
  apiQuery: {},
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  router: { canDismiss: () => false, dismiss: jest.fn(), replace: jest.fn() },
}));

const mockedApi = apiClient as unknown as Record<
  'getMatch' | 'listMatchMemberActivity',
  jest.Mock
>;

describe('MatchMemberActivityScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.getMatch.mockResolvedValue(liveBoard({ metric: 'pushups' }));
  });

  it('lists sets like history rows and opens each set’s detail', async () => {
    mockedApi.listMatchMemberActivity.mockResolvedValue({
      userId: 'ada',
      displayName: 'Ada',
      attempts: [
        {
          attemptId: 'a1',
          count: 40,
          performedAt: '2026-10-22T09:15:00.000Z',
          proofClipId: 'clip-1',
          proofClip: {
            id: 'clip-1',
            displayCode: 'H7K-29Q',
            status: 'ready',
            audience: 'anyone',
            isPostedToGroup: true,
          },
        },
        {
          attemptId: 'a2',
          count: 25,
          performedAt: '2026-10-21T18:00:00.000Z',
          proofClipId: null,
          proofClip: null,
        },
      ],
    });

    const view = renderWithClient(
      <MatchMemberActivityScreen matchId="m1" userId="ada" />,
    );

    expect(await screen.findByTestId('match-member-activity-screen')).toBeOnTheScreen();
    expect(screen.getByText('Ada')).toBeOnTheScreen();
    expect(screen.getByText('2 times')).toBeOnTheScreen();
    expect(screen.getByTestId('match-member-attempt-a1')).toBeOnTheScreen();
    expect(screen.getByText('40')).toBeOnTheScreen();
    expect(screen.getByText('25')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('match-member-attempt-a1'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/matches/[matchId]/member/[userId]/[attemptId]',
      params: { matchId: 'm1', userId: 'ada', attemptId: 'a1' },
    });

    mockPush.mockClear();
    fireEvent.press(screen.getByTestId('match-member-attempt-a2'));
    expect(mockPush).not.toHaveBeenCalled();

    await view.cleanup();
  });

  it('opens the new activity detail for a filmed set, not the bare proof viewer', async () => {
    mockedApi.listMatchMemberActivity.mockResolvedValue({
      userId: 'ada',
      displayName: 'Ada',
      attempts: [
        {
          attemptId: 'filmed',
          count: 40,
          performedAt: '2026-10-22T09:15:00.000Z',
          proofClipId: 'clip-1',
          proofClip: {
            id: 'clip-1',
            displayCode: 'H7K-29Q',
            status: 'ready',
            audience: 'anyone',
            isPostedToGroup: true,
          },
        },
      ],
    });

    const view = renderWithClient(
      <MatchMemberActivityScreen matchId="m1" userId="ada" />,
    );

    fireEvent.press(await screen.findByTestId('match-member-attempt-filmed'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/matches/[matchId]/member/[userId]/[attemptId]',
      params: { matchId: 'm1', userId: 'ada', attemptId: 'filmed' },
    });
    expect(JSON.stringify(mockPush.mock.calls)).not.toMatch(/\/proof\//);

    await view.cleanup();
  });

  it('shows an empty note when they have no sets', async () => {
    mockedApi.listMatchMemberActivity.mockResolvedValue({
      userId: 'tunde',
      displayName: 'Tunde',
      attempts: [],
    });

    const view = renderWithClient(
      <MatchMemberActivityScreen matchId="m1" userId="tunde" />,
    );

    expect(await screen.findByTestId('match-member-attempts-empty')).toBeOnTheScreen();
    expect(screen.getByText('No sets yet in this contest.')).toBeOnTheScreen();
    await view.cleanup();
  });
});
