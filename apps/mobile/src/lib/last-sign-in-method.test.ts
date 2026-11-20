import * as SecureStore from 'expo-secure-store';
import {
  clearLastSignInMethod,
  loadLastSignInMethod,
  saveLastSignInMethod,
} from './last-sign-in-method';

const getItemAsync = jest.mocked(SecureStore.getItemAsync);
const setItemAsync = jest.mocked(SecureStore.setItemAsync);

describe('last sign-in method', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores only the method under its own key', async () => {
    await saveLastSignInMethod('google');

    expect(setItemAsync).toHaveBeenCalledWith('last_sign_in_method', 'google');
  });

  it('does not fail the sign-in when storage cannot be written', async () => {
    setItemAsync.mockRejectedValueOnce(new Error('keychain locked'));

    await expect(saveLastSignInMethod('email')).resolves.toBeUndefined();
  });

  it('loads a saved method', async () => {
    getItemAsync.mockResolvedValueOnce('email');

    await expect(loadLastSignInMethod()).resolves.toBe('email');
  });

  it('has nothing before the first sign-in', async () => {
    getItemAsync.mockResolvedValueOnce(null);

    await expect(loadLastSignInMethod()).resolves.toBeNull();
  });

  it('ignores an unrecognised stored value', async () => {
    getItemAsync.mockResolvedValueOnce('ada@example.com');

    await expect(loadLastSignInMethod()).resolves.toBeNull();
  });

  it('shows no hint when storage cannot be read', async () => {
    getItemAsync.mockRejectedValueOnce(new Error('keychain locked'));

    await expect(loadLastSignInMethod()).resolves.toBeNull();
  });

  it('forgets the method once the account is deleted', async () => {
    await clearLastSignInMethod();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('last_sign_in_method');
  });
});
