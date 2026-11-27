import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { sendSignupVerificationOtp, signOut, verifySignupEmail } from '@/lib/auth-client';
import { VerifyEmailScreen } from './VerifyEmailScreen';
import { CONNECTION_FAILED_MESSAGE } from './constants/auth-messages';

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

function renderScreen(onVerified = jest.fn()) {
  render(<VerifyEmailScreen email="ada@example.com" onVerified={onVerified} />);
  return onVerified;
}

describe('VerifyEmailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSend.mockResolvedValue({ error: null });
    mockedVerify.mockResolvedValue({ error: null });
    mockedSignOut.mockResolvedValue({ error: null });
  });

  it('sends a code on open and moves on by itself at six digits', async () => {
    const onVerified = renderScreen();

    await waitFor(() => {
      expect(mockedSend).toHaveBeenCalledWith('ada@example.com');
    });

    fireEvent.changeText(screen.getByTestId('verify-email-otp'), '000000');

    await waitFor(() => {
      expect(mockedVerify).toHaveBeenCalledWith({ email: 'ada@example.com', otp: '000000' });
    });
    expect(onVerified).toHaveBeenCalledTimes(1);
  });

  it('says a wrong code does not match and stays', async () => {
    mockedVerify.mockResolvedValue({ error: { code: 'INVALID_OTP' } });
    const onVerified = renderScreen();

    fireEvent.changeText(screen.getByTestId('verify-email-otp'), '123456');

    await waitFor(() => {
      expect(screen.getByTestId('email-code-wrong')).toBeOnTheScreen();
    });
    expect(onVerified).not.toHaveBeenCalled();
  });

  it('offers a new code once the code has expired', async () => {
    mockedVerify.mockResolvedValue({ error: { code: 'OTP_EXPIRED' } });
    renderScreen();

    fireEvent.changeText(screen.getByTestId('verify-email-otp'), '123456');

    await waitFor(() => {
      expect(screen.getByTestId('email-code-expired')).toBeOnTheScreen();
    });

    fireEvent.press(screen.getByTestId('verify-email-new-code'));

    await waitFor(() => {
      expect(mockedSend).toHaveBeenCalledTimes(2);
    });
    expect(screen.queryByTestId('email-code-expired')).toBeNull();
  });

  it('goes back by signing out to the signed-out entry', async () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('auth-back'));

    await waitFor(() => {
      expect(useRouter().replace).toHaveBeenCalledWith('/onboarding');
    });
    expect(mockedSignOut).toHaveBeenCalledTimes(1);
  });

  it('stays on verification when sign-out fails', async () => {
    mockedSignOut.mockResolvedValue({ error: { message: 'nope' } });
    renderScreen();

    fireEvent.press(screen.getByTestId('auth-back'));

    await waitFor(() => {
      expect(screen.getByText(CONNECTION_FAILED_MESSAGE)).toBeOnTheScreen();
    });
    expect(useRouter().replace).not.toHaveBeenCalled();
  });
});
