import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { apiClient } from '@/lib/api';
import { MatchJoinScreen } from './MatchJoinScreen';
import { invitePreview, liveBoard, renderWithClient } from './testing/match-fixtures';

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: { previewMatch: jest.fn(), joinMatch: jest.fn() },
  apiQuery: {},
}));

jest.mock('@/lib/auth-client', () => ({
  useSession: () => ({ data: { user: { id: 'me' } }, isPending: false }),
}));

jest.mock('@/lib/deferred-invite', () => ({ stashDeferredInviteToken: jest.fn() }));

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  router: { replace: jest.fn(), canDismiss: () => false, dismiss: jest.fn() },
  Redirect: ({ href }: { href: string }) => {
    const { Text: MockText } = jest.requireActual('react-native');
    return <MockText testID="redirect">{href}</MockText>;
  },
}));

const mockedApi = apiClient as unknown as { previewMatch: jest.Mock; joinMatch: jest.Mock };

describe('MatchJoinScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hands over the invite: the host, the contest, and how many are in', async () => {
    mockedApi.previewMatch.mockResolvedValue(invitePreview());
    mockedApi.joinMatch.mockResolvedValue(liveBoard());
    const view = renderWithClient(<MatchJoinScreen token="tok-1" />);

    expect(await screen.findByText('Ada invited you')).toBeOnTheScreen();
    expect(screen.getByText('Most minutes walked wins.')).toBeOnTheScreen();
    expect(screen.getByText('3 of 8 joined')).toBeOnTheScreen();
    expect(
      screen.getByText('Others see your name and minutes walked. Nothing else.'),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByText('Join Ada’s group'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/matches/m1'));
    await view.cleanup();
  });

  it('says plainly when the group has ended, and offers starting your own', async () => {
    mockedApi.previewMatch.mockResolvedValue(invitePreview({ status: 'completed' }));
    const view = renderWithClient(<MatchJoinScreen token="tok-1" />);

    expect(await screen.findByText('This group has ended.')).toBeOnTheScreen();
    expect(screen.queryByTestId('match-join-accept')).toBeNull();
    fireEvent.press(screen.getByTestId('match-join-start-own'));
    expect(mockReplace).toHaveBeenCalledWith('/matches/create');
    await view.cleanup();
  });

  it('skips the invite for someone already in the group', async () => {
    mockedApi.previewMatch.mockResolvedValue(invitePreview({ alreadyJoined: true }));
    const view = renderWithClient(<MatchJoinScreen token="tok-1" />);

    expect(await screen.findByTestId('redirect')).toHaveTextContent('/matches/m1');
    await view.cleanup();
  });

  it('gives one way out of a link that does not work', async () => {
    mockedApi.previewMatch.mockRejectedValue(new Error('not found'));
    const view = renderWithClient(<MatchJoinScreen token="tok-1" />);

    expect(await screen.findByText('This link doesn’t work.')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('match-join-go-today'));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    await view.cleanup();
  });
});
