import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import {
  sendSignupVerificationOtp,
  signOut,
  verifySignupEmail,
} from '@/lib/auth-client';
import { EmailVerificationOtpScreen } from './EmailVerificationOtpScreen';

jest.mock('@/lib/auth-client', () => ({
  sendSignupVerificationOtp: jest.fn(),
  signOut: jest.fn(),
  verifySignupEmail: jest.fn(),
}));

jest.mock('expo-router', () => {
  const replace = jest.fn();
  return {
    useRouter: () => ({ replace }),
  };
});

const mockedSend = sendSignupVerificationOtp as unknown as jest.Mock;
const mockedVerify = verifySignupEmail as unknown as jest.Mock;
const mockedSignOut = signOut as unknown as jest.Mock;

describe('EmailVerificationOtpScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSend.mockResolvedValue({ error: null });
    mockedVerify.mockResolvedValue({ error: null });
    mockedSignOut.mockResolvedValue({ error: null });
  });

  it('sends a code on open and continues when it is valid', async () => {
    const onVerified = jest.fn();

    render(
      <EmailVerificationOtpScreen
        email="ada@example.com"
        onBackPress={jest.fn()}
        onVerified={onVerified}
      />,
    );

    await waitFor(() => {
      expect(mockedSend).toHaveBeenCalledWith('ada@example.com');
    });

    fireEvent.changeText(screen.getByTestId('verify-email-otp'), '000000');

    await waitFor(() => {
      expect(mockedVerify).toHaveBeenCalledWith({
        email: 'ada@example.com',
        otp: '000000',
      });
    });
    expect(onVerified).toHaveBeenCalledTimes(1);
  });

  it('stays on the screen when the code is rejected', async () => {
    mockedVerify.mockResolvedValue({ error: { message: 'invalid' } });
    const onVerified = jest.fn();

    render(
      <EmailVerificationOtpScreen
        email="ada@example.com"
        onBackPress={jest.fn()}
        onVerified={onVerified}
      />,
    );

    fireEvent.changeText(screen.getByTestId('verify-email-otp'), '123456');

    await waitFor(() => {
      expect(
        screen.getByText('That code is not valid. Try again.'),
      ).toBeOnTheScreen();
    });
    expect(onVerified).not.toHaveBeenCalled();
  });

  it('signs out and opens the signed-out entry for another account', async () => {
    let releaseSignOut: ((result: { error: null }) => void) | undefined;
    mockedSignOut.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseSignOut = resolve;
        }),
    );

    render(
      <EmailVerificationOtpScreen
        email="ada@example.com"
        onBackPress={jest.fn()}
        onVerified={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId('verify-email-use-another-account'));

    await waitFor(() => {
      expect(mockedSignOut).toHaveBeenCalledTimes(1);
    });
    expect(useRouter().replace).not.toHaveBeenCalled();

    releaseSignOut?.({ error: null });

    await waitFor(() => {
      expect(useRouter().replace).toHaveBeenCalledWith('/onboarding');
    });
  });

  it('stays on verification when sign-out fails', async () => {
    mockedSignOut.mockResolvedValue({ error: { message: 'nope' } });

    render(
      <EmailVerificationOtpScreen
        email="ada@example.com"
        onBackPress={jest.fn()}
        onVerified={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId('verify-email-use-another-account'));

    await waitFor(() => {
      expect(
        screen.getByText(
          'We could not reach the server. Check your connection and try again.',
        ),
      ).toBeOnTheScreen();
    });
    expect(useRouter().replace).not.toHaveBeenCalled();
  });
});
