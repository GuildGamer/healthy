import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { requestPasswordResetEmail } from '@/lib/auth-client';
import { ForgotPasswordEmailScreen } from './ForgotPasswordEmailScreen';
import { CONNECTION_FAILED_MESSAGE } from './constants/auth-messages';

jest.mock('@/lib/auth-client', () => ({
  requestPasswordResetEmail: jest.fn(),
}));

const mockedRequest = requestPasswordResetEmail as unknown as jest.Mock;

describe('ForgotPasswordEmailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequest.mockResolvedValue({ error: null });
  });

  it('sends a reset code and continues', async () => {
    const onCodeSent = jest.fn();

    render(
      <ForgotPasswordEmailScreen initialEmail="" onBackPress={jest.fn()} onCodeSent={onCodeSent} />,
    );

    fireEvent.changeText(screen.getByTestId('forgot-email'), 'ada@example.com');
    fireEvent.press(screen.getByTestId('forgot-send-code'));

    await waitFor(() => {
      expect(mockedRequest).toHaveBeenCalledWith('ada@example.com');
    });
    expect(onCodeSent).toHaveBeenCalledWith('ada@example.com');
  });

  it('starts with the email carried over from Log in', () => {
    render(
      <ForgotPasswordEmailScreen
        initialEmail="ada@example.com"
        onBackPress={jest.fn()}
        onCodeSent={jest.fn()}
      />,
    );

    expect(screen.getByTestId('forgot-email').props.value).toBe('ada@example.com');
  });

  it('stays put and says so when the request fails', async () => {
    mockedRequest.mockResolvedValue({ error: { message: 'down' } });
    const onCodeSent = jest.fn();

    render(
      <ForgotPasswordEmailScreen
        initialEmail="ada@example.com"
        onBackPress={jest.fn()}
        onCodeSent={onCodeSent}
      />,
    );
    fireEvent.press(screen.getByTestId('forgot-send-code'));

    await waitFor(() => {
      expect(screen.getByText(CONNECTION_FAILED_MESSAGE)).toBeOnTheScreen();
    });
    expect(onCodeSent).not.toHaveBeenCalled();
  });
});
