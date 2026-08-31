import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { requestPasswordResetEmail } from '@/lib/auth-client';
import { ForgotPasswordEmailScreen } from './ForgotPasswordEmailScreen';

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
      <ForgotPasswordEmailScreen
        onBackPress={jest.fn()}
        onCodeSent={onCodeSent}
      />,
    );

    fireEvent.changeText(screen.getByTestId('forgot-email'), 'ada@example.com');
    fireEvent.press(screen.getByTestId('forgot-send-code'));

    await waitFor(() => {
      expect(mockedRequest).toHaveBeenCalledWith('ada@example.com');
    });
    expect(onCodeSent).toHaveBeenCalledWith('ada@example.com');
  });
});
