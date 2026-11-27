import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { signIn, waitForSession } from '@/lib/auth-client';
import { LoginEmailScreen } from './LoginEmailScreen';

jest.mock('@/lib/auth-client', () => ({
  signIn: { email: jest.fn() },
  waitForSession: jest.fn(),
}));

const mockedSignIn = signIn.email as unknown as jest.Mock;
const mockedWaitForSession = waitForSession as unknown as jest.Mock;

function fillAndSubmit() {
  fireEvent.changeText(screen.getByTestId('login-email-field'), 'ada@example.com');
  fireEvent.changeText(screen.getByTestId('login-password'), 'morningwalk9');
  fireEvent.press(screen.getByTestId('login-submit'));
}

describe('LoginEmailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSignIn.mockResolvedValue({ error: null });
    mockedWaitForSession.mockResolvedValue(true);
  });

  it('signs in and continues', async () => {
    const onSignedIn = jest.fn();
    render(
      <LoginEmailScreen
        onBackPress={jest.fn()}
        onForgotPasswordPress={jest.fn()}
        onSignedIn={onSignedIn}
      />,
    );

    fillAndSubmit();

    await waitFor(() => {
      expect(onSignedIn).toHaveBeenCalledTimes(1);
    });
    expect(mockedSignIn).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'morningwalk9',
    });
  });

  it('gives one message that never says which part was wrong', async () => {
    mockedSignIn.mockResolvedValue({ error: { code: 'INVALID_EMAIL_OR_PASSWORD' } });
    const onSignedIn = jest.fn();
    render(
      <LoginEmailScreen
        onBackPress={jest.fn()}
        onForgotPasswordPress={jest.fn()}
        onSignedIn={onSignedIn}
      />,
    );

    fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByTestId('login-error')).toHaveTextContent(
        'That email and password don’t match. Try again or reset your password.',
      );
    });
    expect(onSignedIn).not.toHaveBeenCalled();
  });

  it('carries the typed email to Forgot password', () => {
    const onForgotPasswordPress = jest.fn();
    render(
      <LoginEmailScreen
        onBackPress={jest.fn()}
        onForgotPasswordPress={onForgotPasswordPress}
        onSignedIn={jest.fn()}
      />,
    );

    fireEvent.changeText(screen.getByTestId('login-email-field'), ' ada@example.com ');
    fireEvent.press(screen.getByTestId('login-forgot-password'));

    expect(onForgotPasswordPress).toHaveBeenCalledWith('ada@example.com');
  });
});
