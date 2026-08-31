import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import {
  confirmEmailChange,
  requestEmailChange,
} from '@/lib/auth-client';
import { ChangeEmailOtpScreen } from './ChangeEmailOtpScreen';

jest.mock('@/lib/auth-client', () => ({
  confirmEmailChange: jest.fn(),
  requestEmailChange: jest.fn(),
}));

const mockedConfirm = confirmEmailChange as unknown as jest.Mock;
const mockedRequest = requestEmailChange as unknown as jest.Mock;

function renderScreen(onChanged = jest.fn()) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <ChangeEmailOtpScreen
        newEmail="ada@new.example"
        onBackPress={jest.fn()}
        onChanged={onChanged}
      />
    </QueryClientProvider>,
  );
}

describe('ChangeEmailOtpScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedConfirm.mockResolvedValue({ error: null });
    mockedRequest.mockResolvedValue({ error: null });
  });

  it('confirms the new email when the code is valid', async () => {
    renderScreen();

    fireEvent.changeText(screen.getByTestId('change-email-otp'), '000000');

    await waitFor(() => {
      expect(mockedConfirm).toHaveBeenCalledWith({
        newEmail: 'ada@new.example',
        otp: '000000',
      });
    });
    expect(await screen.findByTestId('change-email-saved')).toBeOnTheScreen();
  });

  it('stays on the screen when the code is rejected', async () => {
    mockedConfirm.mockResolvedValue({ error: { message: 'invalid' } });

    renderScreen();

    fireEvent.changeText(screen.getByTestId('change-email-otp'), '123456');

    await waitFor(() => {
      expect(
        screen.getByText('That code is not valid. Try again.'),
      ).toBeOnTheScreen();
    });
    expect(screen.queryByTestId('change-email-saved')).toBeNull();
  });
});
