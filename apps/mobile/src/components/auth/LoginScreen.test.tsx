import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { signIn, waitForSession } from '@/lib/auth-client';
import { LoginScreen } from './LoginScreen';

jest.mock('@/lib/auth-client', () => ({
  signIn: {
    email: jest.fn(),
  },
  waitForSession: jest.fn(),
}));

const mockedSignIn = signIn.email as unknown as jest.Mock;
const mockedWaitForSession = waitForSession as unknown as jest.Mock;

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSignIn.mockResolvedValue({ error: null });
    mockedWaitForSession.mockResolvedValue(true);
  });

  it('waits for a session before leaving the screen', async () => {
    const onAuthenticated = jest.fn();

    render(
      <LoginScreen
        onAuthenticated={onAuthenticated}
        onBackPress={jest.fn()}
        onForgotPasswordPress={jest.fn()}
        onSignUpPress={jest.fn()}
      />,
    );

    fireEvent.changeText(screen.getByTestId('login-email'), 'ada@example.com');
    fireEvent.changeText(screen.getByTestId('login-password'), 'secret-pass');
    fireEvent.press(screen.getByTestId('login-submit'));

    await waitFor(() => {
      expect(mockedWaitForSession).toHaveBeenCalled();
    });
    expect(onAuthenticated).toHaveBeenCalledTimes(1);
  });

  it('stays on the form when the session is not ready', async () => {
    mockedWaitForSession.mockResolvedValue(false);
    const onAuthenticated = jest.fn();

    render(
      <LoginScreen
        onAuthenticated={onAuthenticated}
        onBackPress={jest.fn()}
        onForgotPasswordPress={jest.fn()}
        onSignUpPress={jest.fn()}
      />,
    );

    fireEvent.changeText(screen.getByTestId('login-email'), 'ada@example.com');
    fireEvent.changeText(screen.getByTestId('login-password'), 'secret-pass');
    fireEvent.press(screen.getByTestId('login-submit'));

    await waitFor(() => {
      expect(screen.getByText('We could not log you in. Check your details and try again.')).toBeOnTheScreen();
    });
    expect(onAuthenticated).not.toHaveBeenCalled();
  });
});
