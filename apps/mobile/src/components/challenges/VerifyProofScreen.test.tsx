import { mintProofCode } from '@product/contract/proof-code';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { apiClient } from '@/lib/api';
import { VerifyProofScreen } from './VerifyProofScreen';

jest.mock('@/lib/api', () => ({
  apiClient: { verifyProofCode: jest.fn() },
}));

jest.mock('@/lib/go-back', () => ({ goBackOrHome: jest.fn() }));

jest.mock('expo-clipboard', () => ({
  getStringAsync: jest.fn(async () => ''),
}));

jest.mock('expo-video', () => {
  const { View } = jest.requireActual('react-native');
  return {
    useVideoPlayer: () => ({}),
    VideoView: ({ testID }: { testID?: string }) => <View testID={testID} />,
  };
});

const verifyProofCode = apiClient.verifyProofCode as jest.Mock;
const validCode = mintProofCode(new Uint8Array([1, 2, 3, 4, 5, 6, 7]));

function renderScreen(codeParam?: string) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <VerifyProofScreen codeParam={codeParam} />
    </QueryClientProvider>,
  );
}

describe('VerifyProofScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('catches a mistyped code on the phone without calling the server', () => {
    renderScreen('7KQ4M2XA');

    fireEvent.press(screen.getByTestId('verify-submit'));

    expect(screen.getByTestId('verify-error')).toHaveTextContent(
      'That code is not valid. Check each character against the video.',
    );
    expect(verifyProofCode).not.toHaveBeenCalled();
  });

  it('plays the original video for a verified code', async () => {
    verifyProofCode.mockResolvedValue({
      outcome: 'verified',
      metric: 'pushups',
      count: 20,
      recordedAt: '2026-10-26T12:00:00.000Z',
      attested: false,
      videoUrl: 'https://cdn.test/video.mp4',
      posterUrl: null,
    });
    renderScreen(validCode);

    fireEvent.press(screen.getByTestId('verify-submit'));

    expect(await screen.findByTestId('verify-video')).toBeOnTheScreen();
    expect(verifyProofCode).toHaveBeenCalledWith({ code: validCode });
  });

  it.each([
    ['not_shared', 'Not shared yet'],
    ['not_found', 'No clip found'],
  ] as const)('explains a %s code instead of asking to check it', async (outcome, title) => {
    verifyProofCode.mockResolvedValue({ outcome });
    renderScreen(validCode);

    fireEvent.press(screen.getByTestId('verify-submit'));

    expect(await screen.findByText(title)).toBeOnTheScreen();
  });

  it('says the check failed when the request errors', async () => {
    verifyProofCode.mockRejectedValue(new Error('Network request failed'));
    renderScreen(validCode);

    fireEvent.press(screen.getByTestId('verify-submit'));

    expect(await screen.findByTestId('verify-error')).toHaveTextContent(
      'Could not check the code. Try again.',
    );
  });
});
