import { render, screen } from '@testing-library/react-native';
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

jest.mock('@/lib/proof-clip-store', () => ({
  getLocalProofClip: jest.fn(),
}));

jest.mock('@/lib/proof-clip-upload', () => ({
  uploadProofClip: jest.fn(),
  discardLocalProofClip: jest.fn(),
}));

jest.mock('./save-proof-to-photos', () => ({
  saveProofToPhotos: jest.fn(async () => null),
}));

const { useQuery } = jest.requireMock('@tanstack/react-query') as {
  useQuery: jest.Mock;
};

describe('ProofClipActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows an explicit failure message when the clip did not save', () => {
    useQuery.mockReturnValue({ isPending: false, data: null, refetch: jest.fn() });

    render(<ProofClipActions clipId={null} failed visibility="shared" />);

    expect(screen.getByTestId('proof-clip-failed')).toHaveTextContent(
      'Your proof clip didn’t save.',
    );
  });

  it('shows actions when a local clip is present', () => {
    useQuery.mockReturnValue({
      isPending: false,
      data: {
        clipId: 'clip-1',
        fileUri: 'file:///tmp/clip.mp4',
        posterUri: null,
        displayCode: 'ABCD-EFG',
      },
      refetch: jest.fn(),
    });

    render(<ProofClipActions clipId="clip-1" visibility="group" />);

    expect(screen.getByTestId('proof-clip-actions')).toBeOnTheScreen();
    expect(screen.getByTestId('proof-publish')).toHaveTextContent('Post to group');
    expect(screen.getByTestId('proof-save-photos')).toBeOnTheScreen();
  });

  it('shows failure when the clip id is set but nothing is on the phone', () => {
    useQuery.mockReturnValue({ isPending: false, data: null, refetch: jest.fn() });

    render(<ProofClipActions clipId="clip-missing" visibility="shared" />);

    expect(screen.getByTestId('proof-clip-failed')).toBeOnTheScreen();
  });
});
