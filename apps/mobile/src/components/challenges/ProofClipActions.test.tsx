import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Alert } from 'react-native';
import { ProofClipActions } from './ProofClipActions';

jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: jest.fn(),
  };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => false),
  shareAsync: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  apiClient: {
    setProofClipAudience: jest.fn(),
    removeProofClip: jest.fn(),
  },
}));

jest.mock('@/lib/proof-clip-store', () => ({
  getLocalProofClip: jest.fn(),
  markLocalProofClipPendingUpload: jest.fn(async () => undefined),
}));

jest.mock('@/lib/proof-clip-upload', () => ({
  uploadProofClip: jest.fn(),
  queueAnyoneProofClipUpload: jest.fn(async () => true),
  discardLocalProofClip: jest.fn(async () => undefined),
}));

jest.mock('./save-proof-to-photos', () => ({
  saveProofToPhotos: jest.fn(async () => null),
}));

const { useQuery } = jest.requireMock('@tanstack/react-query') as {
  useQuery: jest.Mock;
};
const { uploadProofClip, queueAnyoneProofClipUpload } = jest.requireMock(
  '@/lib/proof-clip-upload',
) as {
  uploadProofClip: jest.Mock;
  queueAnyoneProofClipUpload: jest.Mock;
};

const localClip = {
  clipId: 'clip-1',
  fileUri: 'file:///tmp/clip.mp4',
  posterUri: null,
  displayCode: 'ABCD-EFG',
  durationSeconds: 12,
  count: 10,
};

function renderActions(element: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
}

describe('ProofClipActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows an explicit failure message when the clip did not save', () => {
    useQuery.mockReturnValue({ isPending: false, data: null, refetch: jest.fn() });

    renderActions(<ProofClipActions audience="anyone" clipId={null} failed />);

    expect(screen.getByTestId('proof-clip-failed')).toHaveTextContent(
      'Your proof clip didn’t save.',
    );
  });

  it('shows actions when a local clip is present', () => {
    useQuery.mockReturnValue({
      isPending: false,
      data: localClip,
      refetch: jest.fn(),
    });

    renderActions(<ProofClipActions audience="only_me" clipId="clip-1" isGroup />);

    expect(screen.getByTestId('proof-clip-actions')).toBeOnTheScreen();
    expect(screen.getByTestId('proof-primary')).toHaveTextContent('Post to group');
    expect(screen.getByTestId('proof-save-photos')).toBeOnTheScreen();
  });

  it('shows failure when the clip id is set but nothing is on the phone', () => {
    useQuery.mockReturnValue({ isPending: false, data: null, refetch: jest.fn() });

    renderActions(<ProofClipActions audience="anyone" clipId="clip-missing" />);

    expect(screen.getByTestId('proof-clip-failed')).toBeOnTheScreen();
  });

  it('never shows a raw upload error', async () => {
    useQuery.mockReturnValue({ isPending: false, data: localClip, refetch: jest.fn() });
    uploadProofClip.mockRejectedValue(new Error('PUT https://bucket/abc 403 SignatureDoesNotMatch'));

    renderActions(<ProofClipActions audience="anyone" clipId="clip-1" />);
    fireEvent.press(screen.getByTestId('proof-primary'));

    expect(await screen.findByText('Could not upload the clip. Try again.')).toBeOnTheScreen();
    expect(screen.queryByText(/SignatureDoesNotMatch/)).toBeNull();
  });

  it('says why a second group post today was refused', async () => {
    useQuery.mockReturnValue({ isPending: false, data: localClip, refetch: jest.fn() });
    uploadProofClip.mockRejectedValue(
      Object.assign(new Error('You already posted a clip to this group today.'), {
        code: 'CONFLICT',
      }),
    );

    renderActions(<ProofClipActions audience="only_me" clipId="clip-1" isGroup />);
    fireEvent.press(screen.getByTestId('proof-primary'));

    expect(
      await screen.findByText(
        'You already posted a clip to this group today. Save this one to Photos instead.',
      ),
    ).toBeOnTheScreen();
  });

  it('updates the status line after saving to Photos', async () => {
    useQuery.mockReturnValue({ isPending: false, data: localClip, refetch: jest.fn() });
    queueAnyoneProofClipUpload.mockResolvedValue(true);

    renderActions(<ProofClipActions audience="anyone" clipId="clip-1" />);
    expect(screen.queryByTestId('proof-status-line')).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByTestId('proof-save-photos'));
    });

    expect(queueAnyoneProofClipUpload).toHaveBeenCalledWith('clip-1');
    expect(screen.getByTestId('proof-status-line')).toHaveTextContent(
      'Saved to Photos. Anyone with the code can watch.',
    );
  });

  it('uploads when audience flips to Anyone before the clip is cloud-ready', async () => {
    useQuery.mockReturnValue({ isPending: false, data: localClip, refetch: jest.fn() });
    queueAnyoneProofClipUpload.mockResolvedValue(true);

    renderActions(<ProofClipActions audience="only_me" clipId="clip-1" />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('proof-audience-control-anyone'));
    });

    expect(queueAnyoneProofClipUpload).toHaveBeenCalledWith('clip-1');
  });

  it('treats a discarded clip as gone, not as a failed save', async () => {
    useQuery.mockReturnValue({ isPending: false, data: localClip, refetch: jest.fn() });
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.[1]?.onPress?.();
    });

    renderActions(<ProofClipActions audience="anyone" clipId="clip-1" />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('proof-discard'));
    });

    expect(screen.queryByTestId('proof-clip-actions')).toBeNull();
    expect(screen.queryByTestId('proof-clip-failed')).toBeNull();
  });
});
