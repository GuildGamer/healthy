import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { apiClient } from '@/lib/api';
import { signOut } from '@/lib/auth-client';
import { clearLastSignInMethod } from '@/lib/last-sign-in-method';
import { DeleteAccountScreen } from './DeleteAccountScreen';
import { renderWithProviders } from './testing/settings-fixtures';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
  router: { canDismiss: () => true, dismiss: jest.fn(), replace: jest.fn() },
}));

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: { deleteAccount: jest.fn() },
  apiQuery: {},
}));

jest.mock('@/lib/auth-client', () => ({
  signOut: jest.fn(async () => undefined),
}));

jest.mock('@/lib/last-sign-in-method', () => ({
  clearLastSignInMethod: jest.fn(async () => undefined),
}));

const deleteAccount = jest.mocked(apiClient.deleteAccount);

describe('DeleteAccountScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('says what goes and what stays anonymous before anything happens', () => {
    renderWithProviders(<DeleteAccountScreen />);

    expect(screen.getByText('Delete your account?')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Finished results keep your score as “Former member”, with no name or photo.',
      ),
    ).toBeOnTheScreen();
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it('deletes, shows the ending, and makes the phone forget the account', async () => {
    deleteAccount.mockResolvedValueOnce({ deleted: true });
    renderWithProviders(<DeleteAccountScreen />);

    fireEvent.press(screen.getByTestId('confirm-delete-account'));

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(mockReplace).toHaveBeenCalledWith('/account-deleted');
    expect(clearLastSignInMethod).toHaveBeenCalledTimes(1);
  });

  it('says to cancel a renewing membership first, with a link to the store', async () => {
    deleteAccount.mockRejectedValueOnce({
      code: 'CONFLICT',
      data: {
        reason: 'subscription_renewing',
        store: 'apple',
        renewsAt: '2026-11-03T09:00:00.000Z',
      },
    });
    renderWithProviders(<DeleteAccountScreen />);

    fireEvent.press(screen.getByTestId('confirm-delete-account'));

    expect(
      await screen.findByText(
        'Your membership renews on 3 Nov. Cancel it in the App Store first, then delete your account.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Manage in the App Store')).toBeOnTheScreen();
    expect(signOut).not.toHaveBeenCalled();
    expect(clearLastSignInMethod).not.toHaveBeenCalled();
  });

  it('keeps the account and says so when the request fails', async () => {
    deleteAccount.mockRejectedValueOnce(new Error('Network request failed'));
    renderWithProviders(<DeleteAccountScreen />);

    fireEvent.press(screen.getByTestId('confirm-delete-account'));

    expect(
      await screen.findByText('Couldn’t delete your account. Check your connection and try again.'),
    ).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
