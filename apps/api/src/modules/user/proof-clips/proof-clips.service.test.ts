import { ORPCError } from '@orpc/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProofCodeVerifyRateLimiter } from './proof-code-verify-rate-limiter.js';
import { ProofClipsService } from './proof-clips.service.js';

const owner = { id: 'owner', email: 'owner@a.co', name: 'Ada' };
const stranger = { id: 'stranger', email: 'stranger@a.co', name: 'Bee' };

type ClipRow = {
  id: string;
  userId: string;
  code: string;
  metric: 'pushups';
  count: number;
  durationSeconds: number | null;
  userChallengeId: string | null;
  matchId: string | null;
  matchAttemptId: string | null;
  status: 'reserved' | 'recorded' | 'ready' | 'expired' | 'removed';
  sha256: string | null;
  byteSize: number | null;
  videoKey: string | null;
  posterKey: string | null;
  visibility: 'group' | 'shared' | null;
  sharedAt: Date | null;
  lastViewedAt: Date | null;
  expiresAt: Date | null;
  reservedAt: Date;
  recordedAt: Date | null;
  attested: boolean;
  skeletonTrack: string | null;
};

function clip(overrides: Partial<ClipRow> = {}): ClipRow {
  const recordedAt = new Date('2026-10-20T12:00:00.000Z');
  return {
    id: 'clip1',
    userId: owner.id,
    code: '7KQ4M2XD',
    metric: 'pushups',
    count: 42,
    durationSeconds: 30,
    userChallengeId: null,
    matchId: 'match1',
    matchAttemptId: null,
    status: 'ready',
    sha256: 'a'.repeat(64),
    byteSize: 1_024,
    videoKey: 'clips/owner/clip1/video.mp4',
    posterKey: 'clips/owner/clip1/poster.jpg',
    visibility: 'shared',
    sharedAt: recordedAt,
    lastViewedAt: null,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    reservedAt: recordedAt,
    recordedAt,
    attested: true,
    skeletonTrack: null,
    ...overrides,
  };
}

function createHarness(initial?: ClipRow) {
  let current = initial ?? clip();
  const storage = {
    head: vi.fn().mockResolvedValue({ byteSize: current.byteSize }),
    presignPut: vi.fn(),
    presignGet: vi.fn().mockImplementation(async (key: string) => `https://cdn.test/${key}`),
  };
  const prisma = {
    proofClip: {
      findUnique: vi.fn().mockImplementation(async ({ where }: { where: { code?: string; id?: string } }) => {
        if (where.code && where.code !== current.code) {
          return null;
        }
        if (where.id && where.id !== current.id) {
          return null;
        }
        return current;
      }),
      update: vi.fn().mockImplementation(async ({ data }: { data: Partial<ClipRow> }) => {
        current = { ...current, ...data };
        return current;
      }),
      count: vi.fn().mockResolvedValue(0),
    },
    match: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'match1',
        hostUserId: owner.id,
        endsAt: new Date(Date.now() + 60 * 60 * 1000),
        participants: [{ userId: owner.id, acceptedAt: new Date() }],
      }),
    },
  };

  const service = new ProofClipsService(
    prisma as never,
    storage as never,
    new ProofCodeVerifyRateLimiter(),
  );

  return {
    service,
    prisma,
    storage,
    getCurrent: () => current,
    setCurrent: (next: ClipRow) => {
      current = next;
    },
  };
}

describe('ProofClipsService.verifyPublic', () => {
  it('verifies a shared ready clip', async () => {
    const { service, storage } = createHarness(clip({ visibility: 'shared' }));
    await expect(service.verifyPublic('7KQ4M2XD', '1.2.3.4')).resolves.toMatchObject({
      outcome: 'verified',
      count: 42,
      attested: true,
      videoUrl: 'https://cdn.test/clips/owner/clip1/video.mp4',
      posterUrl: 'https://cdn.test/clips/owner/clip1/poster.jpg',
    });
    expect(storage.presignGet).toHaveBeenCalled();
  });

  it('returns not_shared for group and null visibility', async () => {
    const group = createHarness(clip({ visibility: 'group' }));
    await expect(group.service.verifyPublic('7KQ4M2XD', '1.2.3.4')).resolves.toEqual({
      outcome: 'not_shared',
    });

    const unset = createHarness(clip({ visibility: null }));
    await expect(unset.service.verifyPublic('7KQ4M2XD', '1.2.3.4')).resolves.toEqual({
      outcome: 'not_shared',
    });
  });

  it('returns removed, expired, and not_found outcomes', async () => {
    const removed = createHarness(clip({ status: 'removed', visibility: 'shared' }));
    await expect(removed.service.verifyPublic('7KQ4M2XD', '1.2.3.4')).resolves.toEqual({
      outcome: 'removed',
    });

    const expired = createHarness(
      clip({
        visibility: 'shared',
        status: 'expired',
        expiresAt: new Date(Date.now() - 1_000),
      }),
    );
    await expect(expired.service.verifyPublic('7KQ4M2XD', '1.2.3.4')).resolves.toMatchObject({
      outcome: 'original_expired',
      count: 42,
    });

    const missing = createHarness(clip());
    missing.prisma.proofClip.findUnique.mockResolvedValueOnce(null);
    await expect(missing.service.verifyPublic('AAAAAAAA', '1.2.3.4')).resolves.toEqual({
      outcome: 'not_found',
    });
  });

  it('does not touch lastViewedAt for anonymous verify', async () => {
    const { service, prisma } = createHarness(clip({ visibility: 'shared' }));
    await service.verifyPublic('7KQ4M2XD', '9.9.9.9');
    expect(prisma.proofClip.update).not.toHaveBeenCalled();
  });
});

describe('ProofClipsService.verify', () => {
  it('lets a non-participant see a shared clip', async () => {
    const { service } = createHarness(clip({ visibility: 'shared' }));
    await expect(service.verify(stranger, '7KQ4M2XD')).resolves.toMatchObject({
      outcome: 'verified',
      count: 42,
    });
  });

  it('blocks a non-participant from a group-only clip', async () => {
    const { service } = createHarness(clip({ visibility: 'group', sharedAt: new Date() }));
    await expect(service.verify(stranger, '7KQ4M2XD')).resolves.toEqual({
      outcome: 'not_shared',
    });
  });

  it('lets the owner verify a group clip', async () => {
    const { service } = createHarness(clip({ visibility: 'group' }));
    await expect(service.verify(owner, '7KQ4M2XD')).resolves.toMatchObject({
      outcome: 'verified',
    });
  });

  it.each(['reserved', 'recorded'] as const)(
    'calls a %s clip not shared rather than an unknown code',
    async (status) => {
      const { service } = createHarness(
        clip({ status, visibility: null, sharedAt: null, expiresAt: null }),
      );
      await expect(service.verify(owner, '7KQ4M2XD')).resolves.toEqual({
        outcome: 'not_shared',
      });
    },
  );
});

describe('ProofClipsService.requestUpload', () => {
  it('refuses a second group post before any upload URL is issued', async () => {
    const { service, prisma, storage } = createHarness(
      clip({ status: 'recorded', visibility: null, sharedAt: null, expiresAt: null }),
    );
    prisma.proofClip.count.mockResolvedValueOnce(1);

    await expect(
      service.requestUpload(owner, {
        clipId: 'clip1',
        videoByteSize: 1_024,
        visibility: 'group',
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(storage.presignPut).not.toHaveBeenCalled();
  });
});

describe('ProofClipsService.completeUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists visibility when finishing an upload', async () => {
    const recorded = clip({
      status: 'recorded',
      visibility: null,
      sharedAt: null,
      expiresAt: null,
      videoKey: 'clips/owner/clip1/video.mp4',
      recordedAt: new Date('2026-10-20T12:00:00.000Z'),
    });
    const { service, prisma, getCurrent } = createHarness(recorded);

    await service.completeUpload(owner, { clipId: 'clip1', visibility: 'shared' });

    expect(prisma.proofClip.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'ready',
          visibility: 'shared',
        }),
      }),
    );
    expect(getCurrent().visibility).toBe('shared');
  });

  it('upgrades group to shared but never downgrades shared', async () => {
    const groupReady = createHarness(
      clip({ status: 'ready', visibility: 'group', expiresAt: new Date() }),
    );
    await groupReady.service.completeUpload(owner, {
      clipId: 'clip1',
      visibility: 'shared',
    });
    expect(groupReady.getCurrent().visibility).toBe('shared');

    const sharedReady = createHarness(
      clip({ status: 'ready', visibility: 'shared', expiresAt: new Date() }),
    );
    await sharedReady.service.completeUpload(owner, {
      clipId: 'clip1',
      visibility: 'group',
    });
    expect(sharedReady.getCurrent().visibility).toBe('shared');
    expect(sharedReady.prisma.proofClip.update).not.toHaveBeenCalled();
  });

  it('rejects a group post without a match', async () => {
    const solo = createHarness(
      clip({
        status: 'recorded',
        matchId: null,
        visibility: null,
        videoKey: 'clips/owner/clip1/video.mp4',
        recordedAt: new Date(),
      }),
    );
    await expect(
      solo.service.completeUpload(owner, { clipId: 'clip1', visibility: 'group' }),
    ).rejects.toBeInstanceOf(ORPCError);
  });
});
