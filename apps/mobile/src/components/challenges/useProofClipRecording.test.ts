import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { canRecordProofClips } from 'quickpose-camera';
import { createElement, type ReactNode } from 'react';
import { apiClient } from '@/lib/api';
import { saveLocalProofClip } from '@/lib/proof-clip-store';
import { queueAnyoneProofClipUpload } from '@/lib/proof-clip-upload';
import { useProofClipRecording } from './useProofClipRecording';

jest.mock('@/lib/api', () => ({
  apiClient: {
    reserveProofClip: jest.fn(),
    recordProofClip: jest.fn(),
    removeProofClip: jest.fn(),
    me: jest.fn(async () => ({ proofClipAudience: 'anyone' })),
    updateProofClipAudience: jest.fn(async () => ({ proofClipAudience: 'anyone' })),
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

jest.mock('@/lib/proof-clip-upload', () => ({
  queueAnyoneProofClipUpload: jest.fn(async () => true),
}));

const mockedApi = apiClient as unknown as {
  reserveProofClip: jest.Mock;
  recordProofClip: jest.Mock;
  removeProofClip: jest.Mock;
  me: jest.Mock;
  updateProofClipAudience: jest.Mock;
};

const mockedSaveLocal = saveLocalProofClip as jest.MockedFunction<typeof saveLocalProofClip>;
const mockedQueueUpload = queueAnyoneProofClipUpload as jest.MockedFunction<
  typeof queueAnyoneProofClipUpload
>;

const context = {
  props: { mode: 'challenge' as const, challengeId: 'ch-1' },
  metric: 'pushups' as const,
  userChallengeId: 'uc-1',
  matchId: null,
  isReady: true,
};

function reservation(clipId = 'clip-1') {
  return {
    clipId,
    code: 'ABCDEFG',
    displayCode: 'ABCD-EFG',
    reservedUntil: new Date(Date.now() + 30 * 60_000).toISOString(),
    encoding: {
      bitRate: 1_500_000,
      frameRate: 24,
      width: 720,
      height: 1280,
    },
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return createElement(QueryClientProvider, { client }, children);
}

async function renderArmed(getRepCount: () => number, hookContext = context) {
  const rendered = renderHook(() => useProofClipRecording(hookContext, getRepCount), { wrapper });
  await waitFor(() => expect(rendered.result.current.recordProof).toBe(true));
  return rendered;
}

async function startRecording(result: { current: ReturnType<typeof useProofClipRecording> }) {
  act(() => {
    result.current.armForCounting();
  });
  await waitFor(() => expect(result.current.status).toBe('recording'));
}

describe('useProofClipRecording', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockedApi.reserveProofClip.mockResolvedValue(reservation());
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

  it('holds a code during setup and uses it when counting starts', async () => {
    const { result } = await renderArmed(() => 0);
    await waitFor(() => expect(mockedApi.reserveProofClip).toHaveBeenCalledTimes(1));

    await startRecording(result);

    expect(mockedApi.reserveProofClip).toHaveBeenCalledTimes(1);
    expect(result.current.proofRecording).toEqual(
      expect.objectContaining({
        code: 'ABCD-EFG',
        bitRate: 1_500_000,
        frameRate: 24,
        width: 720,
        height: 1280,
      }),
    );
  });

  it('falls back to on-device defaults when reserve omits encoding', async () => {
    mockedApi.reserveProofClip.mockResolvedValue({
      clipId: 'clip-1',
      code: 'ABCDEFG',
      displayCode: 'ABCD-EFG',
      reservedUntil: new Date(Date.now() + 30 * 60_000).toISOString(),
    });
    const { result } = await renderArmed(() => 0);
    await startRecording(result);

    expect(result.current.proofRecording).toEqual(
      expect.objectContaining({
        code: 'ABCD-EFG',
        bitRate: 1_500_000,
        frameRate: 24,
        width: 720,
        height: 1280,
      }),
    );
  });

  it('keeps recording off and holds no code where the camera cannot write clips', async () => {
    jest.mocked(canRecordProofClips).mockReturnValue(false);
    try {
      const { result } = renderHook(() => useProofClipRecording(context, () => 0), { wrapper });

      act(() => {
        result.current.armForCounting();
      });

      expect(result.current.isSupported).toBe(false);
      expect(result.current.recordProof).toBe(false);
      expect(result.current.status).toBe('off');
      expect(mockedApi.reserveProofClip).not.toHaveBeenCalled();
    } finally {
      jest.mocked(canRecordProofClips).mockReturnValue(true);
    }
  });

  it('does not hold a code before the context is known', async () => {
    await renderArmed(() => 0, { ...context, isReady: false });

    expect(mockedApi.reserveProofClip).not.toHaveBeenCalled();
  });

  it('reserves on demand when the held code failed', async () => {
    mockedApi.reserveProofClip
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(reservation('clip-2'));
    const { result } = await renderArmed(() => 0);
    await waitFor(() => expect(mockedApi.reserveProofClip).toHaveBeenCalledTimes(1));

    await startRecording(result);

    expect(mockedApi.reserveProofClip).toHaveBeenCalledTimes(2);
    expect(result.current.clipIdRef.current).toBe('clip-2');
  });

  it('fails the clip and drops the code when the set ends before it arrives', async () => {
    let resolveReserve: (value: ReturnType<typeof reservation>) => void = () => undefined;
    mockedApi.reserveProofClip.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveReserve = resolve;
        }),
    );
    const { result } = await renderArmed(() => 2, { ...context, isReady: false });

    act(() => {
      result.current.armForCounting();
    });
    expect(result.current.status).toBe('reserving');

    let outcome: string | undefined;
    act(() => {
      result.current.requestFinish();
      void result.current.waitUntilSettled().then((value) => {
        outcome = value;
      });
    });

    await waitFor(() => expect(outcome).toBe('failed'));
    expect(result.current.proofFailed).toBe(true);

    await act(async () => {
      resolveReserve(reservation());
    });
    await waitFor(() =>
      expect(mockedApi.removeProofClip).toHaveBeenCalledWith({ clipId: 'clip-1' }),
    );
    expect(result.current.status).toBe('failed');
  });

  it('waits for onProofRecorded before resolving saved', async () => {
    const { result } = await renderArmed(() => 12);
    await startRecording(result);

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

  it('queues an Anyone upload once the local clip is saved', async () => {
    const { result } = await renderArmed(() => 12);
    await startRecording(result);
    act(() => {
      result.current.requestFinish();
    });

    await act(async () => {
      await result.current.handleProofRecorded({
        fileUri: 'file:///tmp/clip.mp4',
        sha256: 'a'.repeat(64),
        byteSize: 2048,
        durationSeconds: 15,
      });
    });

    expect(mockedQueueUpload).toHaveBeenCalledWith('clip-1');
  });

  it('does not upload when audience is Only me', async () => {
    mockedApi.me.mockResolvedValueOnce({ proofClipAudience: 'only_me' });
    const { result } = await renderArmed(() => 12);
    await waitFor(() => expect(result.current.audience).toBe('only_me'));
    await startRecording(result);
    act(() => {
      result.current.requestFinish();
    });

    await act(async () => {
      await result.current.handleProofRecorded({
        fileUri: 'file:///tmp/clip.mp4',
        sha256: 'a'.repeat(64),
        byteSize: 2048,
        durationSeconds: 15,
      });
    });

    expect(mockedQueueUpload).not.toHaveBeenCalled();
  });

  it('saves locally even when recordProofClip rejects', async () => {
    mockedApi.recordProofClip.mockRejectedValueOnce(new Error('offline'));
    const { result } = await renderArmed(() => 8);
    await startRecording(result);
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
    const { result } = await renderArmed(() => 3);
    await startRecording(result);
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
    const { result } = await renderArmed(() => 1);
    await startRecording(result);

    await act(async () => {
      await result.current.discardReservation();
    });

    expect(mockedApi.removeProofClip).toHaveBeenCalledWith({ clipId: 'clip-1' });
  });

  it('releases a held code when leaving before counting', async () => {
    const { result } = await renderArmed(() => 0);
    await waitFor(() => expect(mockedApi.reserveProofClip).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.discardReservation();
    });

    await waitFor(() =>
      expect(mockedApi.removeProofClip).toHaveBeenCalledWith({ clipId: 'clip-1' }),
    );
  });
});
