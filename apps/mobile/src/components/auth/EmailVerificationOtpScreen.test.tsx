import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import {
  sendSignupVerificationOtp,
  verifySignupEmail,
} from '@/lib/auth-client';
import { EmailVerificationOtpScreen } from './EmailVerificationOtpScreen';

jest.mock('@/lib/auth-client', () => ({
  sendSignupVerificationOtp: jest.fn(),
  verifySignupEmail: jest.fn(),
}));

const mockedSend = sendSignupVerificationOtp as unknown as jest.Mock;
const mockedVerify = verifySignupEmail as unknown as jest.Mock;

describe('EmailVerificationOtpScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSend.mockResolvedValue({ error: null });
    mockedVerify.mockResolvedValue({ error: null });
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
});
