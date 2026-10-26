import { act, renderHook, waitFor } from '@testing-library/react-native';
import { apiClient } from '@/lib/api';
import { saveLocalProofClip } from '@/lib/proof-clip-store';
import { useProofClipRecording } from './useProofClipRecording';

jest.mock('@/lib/api', () => ({
  apiClient: {
    reserveProofClip: jest.fn(),
    recordProofClip: jest.fn(),
    removeProofClip: jest.fn(),
  },
}));

jest.mock('@/lib/proof-clip-preference', () => ({
  getProofRecordingEnabled: jest.fn(async () => true),
  hasSeenProofExplainer: jest.fn(async () => true),
  markProofExplainerSeen: jest.fn(async () => undefined),
  setProofRecordingEnabled: jest.fn(async () => undefined),
}));

jest.mock('@/lib/proof-clip-store', () => ({
  saveLocalProofClip: jest.fn(async () => undefined),
  markLocalProofClipServerRecorded: jest.fn(async () => undefined),
}));

const mockedApi = apiClient as unknown as {
  reserveProofClip: jest.Mock;
  recordProofClip: jest.Mock;
  removeProofClip: jest.Mock;
};

const mockedSaveLocal = saveLocalProofClip as jest.MockedFunction<typeof saveLocalProofClip>;

const context = {
  props: { mode: 'challenge' as const, challengeId: 'ch-1' },
  metric: 'pushups' as const,
  userChallengeId: 'uc-1',
  matchId: null,
};

describe('useProofClipRecording', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockedApi.reserveProofClip.mockResolvedValue({
      clipId: 'clip-1',
      code: 'ABCDEFG',
      displayCode: 'ABCD-EFG',
      reservedUntil: new Date(Date.now() + 30 * 60_000).toISOString(),
    });
    mockedApi.recordProofClip.mockResolvedValue({
      clipId: 'clip-1',
      status: 'recorded',
      attested: false,
    });
    mockedApi.removeProofClip.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('waits for onProofRecorded before resolving saved', async () => {
    const { result } = renderHook(() => useProofClipRecording(context, () => 12));

    await waitFor(() => expect(result.current.recordProof).toBe(true));

    await act(async () => {
      await result.current.armForCounting();
    });
    expect(result.current.status).toBe('recording');

    act(() => {
      result.current.requestFinish();
    });
    expect(result.current.status).toBe('finalizing');

    let outcome: string | undefined;
    act(() => {
      void result.current.waitUntilSettled().then((value) => {
        outcome = value;
      });
    });

    await act(async () => {
      await result.current.handleProofRecorded({
        fileUri: 'file:///tmp/clip.mp4',
        sha256: 'a'.repeat(64),
        byteSize: 2048,
        durationSeconds: 15,
      });
    });

    await waitFor(() => expect(outcome).toBe('saved'));
    expect(result.current.status).toBe('saved');
    expect(mockedSaveLocal).toHaveBeenCalledWith(
      expect.objectContaining({ clipId: 'clip-1', serverRecorded: false, count: 12 }),
    );
  });

  it('saves locally even when recordProofClip rejects', async () => {
    mockedApi.recordProofClip.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useProofClipRecording(context, () => 8));

    await waitFor(() => expect(result.current.recordProof).toBe(true));
    await act(async () => {
      await result.current.armForCounting();
    });
    act(() => {
      result.current.requestFinish();
    });

    let outcome: string | undefined;
    act(() => {
      void result.current.waitUntilSettled().then((value) => {
        outcome = value;
      });
    });

    await act(async () => {
      await result.current.handleProofRecorded({
        fileUri: 'file:///tmp/clip.mp4',
        sha256: 'b'.repeat(64),
        byteSize: 1000,
        durationSeconds: 10,
      });
    });

    await waitFor(() => expect(outcome).toBe('saved'));
    expect(mockedSaveLocal).toHaveBeenCalled();
    expect(result.current.proofClipId).toBe('clip-1');
  });

  it('resolves failed after the settle timeout', async () => {
    const { result } = renderHook(() => useProofClipRecording(context, () => 3));

    await waitFor(() => expect(result.current.recordProof).toBe(true));
    await act(async () => {
      await result.current.armForCounting();
    });
    act(() => {
      result.current.requestFinish();
    });

    let outcome: string | undefined;
    act(() => {
      void result.current.waitUntilSettled().then((value) => {
        outcome = value;
      });
    });

    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });

    await waitFor(() => expect(outcome).toBe('failed'));
    expect(result.current.proofFailed).toBe(true);
  });

  it('calls removeProofClip when leaving mid-recording', async () => {
    const { result } = renderHook(() => useProofClipRecording(context, () => 1));

    await waitFor(() => expect(result.current.recordProof).toBe(true));
    await act(async () => {
      await result.current.armForCounting();
    });
    expect(result.current.status).toBe('recording');

    await act(async () => {
      await result.current.discardReservation();
    });

    expect(mockedApi.removeProofClip).toHaveBeenCalledWith({ clipId: 'clip-1' });
  });
});
