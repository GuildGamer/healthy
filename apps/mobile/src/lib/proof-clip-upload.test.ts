import { apiClient } from '@/lib/api';
import { getLocalProofClip, markLocalProofClipServerRecorded } from '@/lib/proof-clip-store';
import { uploadProofClip } from './proof-clip-upload';

jest.mock('@/lib/api', () => ({
  apiClient: {
    recordProofClip: jest.fn(),
    requestProofClipUpload: jest.fn(),
    completeProofClipUpload: jest.fn(),
    removeProofClip: jest.fn(),
  },
}));

jest.mock('@/lib/proof-clip-store', () => ({
  getLocalProofClip: jest.fn(),
  markLocalProofClipServerRecorded: jest.fn(),
  removeLocalProofClip: jest.fn(),
}));

const mockedApi = apiClient as unknown as {
  recordProofClip: jest.Mock;
  requestProofClipUpload: jest.Mock;
  completeProofClipUpload: jest.Mock;
};

const mockedGetLocal = getLocalProofClip as jest.MockedFunction<typeof getLocalProofClip>;
const mockedMark = markLocalProofClipServerRecorded as jest.MockedFunction<
  typeof markLocalProofClipServerRecorded
>;

describe('uploadProofClip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('file://')) {
        return {
          ok: true,
          blob: async () => new Blob(['video']),
        } as Response;
      }
      return { ok: true } as Response;
    }) as typeof fetch;
  });

  it('calls recordProofClip when serverRecorded is false', async () => {
    mockedGetLocal.mockResolvedValue({
      clipId: 'clip-1',
      fileUri: 'file:///tmp/clip.mp4',
      posterUri: null,
      sha256: 'a'.repeat(64),
      byteSize: 1024,
      durationSeconds: 12,
      count: 10,
      code: 'ABCDEFG',
      displayCode: 'ABCD-EFG',
      recordedAt: new Date().toISOString(),
      userChallengeId: null,
      matchId: null,
      serverRecorded: false,
    });
    mockedApi.recordProofClip.mockResolvedValue({
      clipId: 'clip-1',
      status: 'recorded',
      attested: false,
    });
    mockedApi.requestProofClipUpload.mockResolvedValue({
      video: { url: 'https://upload.example/video', headers: {}, key: 'v' },
      poster: null,
    });
    mockedApi.completeProofClipUpload.mockResolvedValue({
      clipId: 'clip-1',
      status: 'ready',
      expiresAt: new Date().toISOString(),
    });

    await uploadProofClip({ clipId: 'clip-1', audience: 'anyone' });

    expect(mockedApi.recordProofClip).toHaveBeenCalledWith(
      expect.objectContaining({ clipId: 'clip-1', count: 10 }),
    );
    expect(mockedMark).toHaveBeenCalledWith('clip-1');
    expect(mockedApi.completeProofClipUpload).toHaveBeenCalledWith({
      clipId: 'clip-1',
      audience: 'anyone',
      postToGroup: false,
    });
  });

  it('skips recordProofClip when already server-recorded', async () => {
    mockedGetLocal.mockResolvedValue({
      clipId: 'clip-1',
      fileUri: 'file:///tmp/clip.mp4',
      posterUri: null,
      sha256: 'a'.repeat(64),
      byteSize: 1024,
      durationSeconds: 12,
      count: 10,
      code: 'ABCDEFG',
      displayCode: 'ABCD-EFG',
      recordedAt: new Date().toISOString(),
      userChallengeId: null,
      matchId: null,
      serverRecorded: true,
    });
    mockedApi.requestProofClipUpload.mockResolvedValue({
      video: { url: 'https://upload.example/video', headers: {}, key: 'v' },
      poster: null,
    });
    mockedApi.completeProofClipUpload.mockResolvedValue({
      clipId: 'clip-1',
      status: 'ready',
      expiresAt: new Date().toISOString(),
    });

    await uploadProofClip({ clipId: 'clip-1', audience: 'only_me', postToGroup: true });

    expect(mockedApi.recordProofClip).not.toHaveBeenCalled();
  });

  it('uploads the poster and sends audience so the server can refuse a board post early', async () => {
    mockedGetLocal.mockResolvedValue({
      clipId: 'clip-1',
      fileUri: 'file:///tmp/clip.mp4',
      posterUri: 'file:///tmp/poster.jpg',
      sha256: 'a'.repeat(64),
      byteSize: 1024,
      durationSeconds: 12,
      count: 10,
      code: 'ABCDEFG',
      displayCode: 'ABCD-EFG',
      recordedAt: new Date().toISOString(),
      userChallengeId: null,
      matchId: 'match-1',
      serverRecorded: true,
    });
    mockedApi.requestProofClipUpload.mockResolvedValue({
      video: { url: 'https://upload.example/video', headers: {}, key: 'v' },
      poster: { url: 'https://upload.example/poster', headers: {}, key: 'p' },
    });
    mockedApi.completeProofClipUpload.mockResolvedValue({
      clipId: 'clip-1',
      status: 'ready',
      expiresAt: new Date().toISOString(),
    });

    await uploadProofClip({ clipId: 'clip-1', audience: 'only_me', postToGroup: true });

    expect(mockedApi.requestProofClipUpload).toHaveBeenCalledWith({
      clipId: 'clip-1',
      videoByteSize: 1024,
      posterByteSize: 5,
      audience: 'only_me',
      postToGroup: true,
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://upload.example/poster',
      expect.objectContaining({ method: 'PUT' }),
    );
  });
});
