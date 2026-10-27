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
  audience: 'anyone' | 'only_me' | null;
  postedToGroupAt: Date | null;
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
    audience: 'anyone',
    postedToGroupAt: null,
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
      findMany: vi.fn().mockResolvedValue([]),
    },
    userBlock: {
      findMany: vi.fn().mockResolvedValue([]),
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
  it('verifies a clip anyone may watch', async () => {
    const { service, storage } = createHarness(clip({ audience: 'anyone' }));
    await expect(service.verifyPublic('7KQ4M2XD', '1.2.3.4')).resolves.toMatchObject({
      outcome: 'verified',
      count: 42,
      attested: true,
      videoUrl: 'https://cdn.test/clips/owner/clip1/video.mp4',
      posterUrl: 'https://cdn.test/clips/owner/clip1/poster.jpg',
    });
    expect(storage.presignGet).toHaveBeenCalled();
  });

  it('returns private for only_me and unset audience', async () => {
    const privateClip = createHarness(clip({ audience: 'only_me', visibility: 'group' }));
    await expect(privateClip.service.verifyPublic('7KQ4M2XD', '1.2.3.4')).resolves.toEqual({
      outcome: 'private',
    });

    const unset = createHarness(clip({ audience: null, visibility: null }));
    await expect(unset.service.verifyPublic('7KQ4M2XD', '1.2.3.4')).resolves.toEqual({
      outcome: 'private',
    });
  });

  it('returns removed, expired, and not_found outcomes', async () => {
    const removed = createHarness(clip({ status: 'removed', audience: 'anyone' }));
    await expect(removed.service.verifyPublic('7KQ4M2XD', '1.2.3.4')).resolves.toEqual({
      outcome: 'removed',
    });

    const expired = createHarness(
      clip({
        audience: 'anyone',
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
    const { service, prisma } = createHarness(clip({ audience: 'anyone' }));
    await service.verifyPublic('7KQ4M2XD', '9.9.9.9');
    expect(prisma.proofClip.update).not.toHaveBeenCalled();
  });
});

describe('ProofClipsService.verify', () => {
  it('lets a non-participant see a clip anyone may watch', async () => {
    const { service } = createHarness(clip({ audience: 'anyone' }));
    await expect(service.verify(stranger, '7KQ4M2XD')).resolves.toMatchObject({
      outcome: 'verified',
      count: 42,
    });
  });

  it('returns private for a non-participant on an only_me clip', async () => {
    const { service } = createHarness(
      clip({
        audience: 'only_me',
        visibility: 'group',
        postedToGroupAt: new Date(),
        sharedAt: new Date(),
      }),
    );
    await expect(service.verify(stranger, '7KQ4M2XD')).resolves.toEqual({
      outcome: 'private',
    });
  });

  it('lets the owner verify an only_me clip', async () => {
    const { service } = createHarness(clip({ audience: 'only_me', visibility: 'group' }));
    await expect(service.verify(owner, '7KQ4M2XD')).resolves.toMatchObject({
      outcome: 'verified',
    });
  });

  it.each(['reserved', 'recorded'] as const)(
    'calls a %s clip not_uploaded rather than an unknown code',
    async (status) => {
      const { service } = createHarness(
        clip({
          status,
          audience: 'anyone',
          visibility: null,
          sharedAt: null,
          expiresAt: null,
        }),
      );
      await expect(service.verify(owner, '7KQ4M2XD')).resolves.toEqual({
        outcome: 'not_uploaded',
      });
    },
  );
});

describe('ProofClipsService.setAudience', () => {
  it('narrows an uploaded clip to only_me and marks it for sweep', async () => {
    const { service, prisma, getCurrent } = createHarness(
      clip({ audience: 'anyone', visibility: 'shared', postedToGroupAt: null }),
    );

    const presented = await service.setAudience(owner, {
      clipId: 'clip1',
      audience: 'only_me',
    });

    expect(presented.audience).toBe('only_me');
    expect(prisma.proofClip.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          audience: 'only_me',
          expiresAt: expect.any(Date),
        }),
      }),
    );
    expect(getCurrent().audience).toBe('only_me');
  });

  it('widens an only_me clip to anyone without clearing a board post', async () => {
    const postedAt = new Date('2026-10-20T12:00:00.000Z');
    const { service, getCurrent } = createHarness(
      clip({
        audience: 'only_me',
        visibility: 'group',
        postedToGroupAt: postedAt,
      }),
    );

    await service.setAudience(owner, { clipId: 'clip1', audience: 'anyone' });
    expect(getCurrent()).toMatchObject({
      audience: 'anyone',
      postedToGroupAt: postedAt,
      visibility: 'group',
    });
  });
});

describe('ProofClipsService.requestUpload', () => {
  it('refuses a second group post before any upload URL is issued', async () => {
    const { service, prisma, storage } = createHarness(
      clip({
        status: 'recorded',
        audience: null,
        visibility: null,
        sharedAt: null,
        expiresAt: null,
      }),
    );
    prisma.proofClip.count.mockResolvedValueOnce(1);

    await expect(
      service.requestUpload(owner, {
        clipId: 'clip1',
        videoByteSize: 1_024,
        postToGroup: true,
        audience: 'only_me',
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(storage.presignPut).not.toHaveBeenCalled();
  });
});

describe('ProofClipsService.completeUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists audience when finishing an upload', async () => {
    const recorded = clip({
      status: 'recorded',
      audience: null,
      visibility: null,
      sharedAt: null,
      expiresAt: null,
      videoKey: 'clips/owner/clip1/video.mp4',
      recordedAt: new Date('2026-10-20T12:00:00.000Z'),
    });
    const { service, prisma, getCurrent } = createHarness(recorded);

    await service.completeUpload(owner, { clipId: 'clip1', audience: 'anyone' });

    expect(prisma.proofClip.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'ready',
          audience: 'anyone',
          visibility: 'shared',
        }),
      }),
    );
    expect(getCurrent().audience).toBe('anyone');
  });

  it('keeps anyone when a ready clip is completed again for the board', async () => {
    const sharedReady = createHarness(
      clip({
        status: 'ready',
        audience: 'anyone',
        visibility: 'shared',
        postedToGroupAt: null,
        expiresAt: new Date(),
      }),
    );
    await sharedReady.service.completeUpload(owner, {
      clipId: 'clip1',
      audience: 'only_me',
      postToGroup: true,
    });
    expect(sharedReady.getCurrent()).toMatchObject({
      audience: 'anyone',
      visibility: 'group',
      postedToGroupAt: expect.any(Date),
    });
  });

  it('rejects a group post without a match', async () => {
    const solo = createHarness(
      clip({
        status: 'recorded',
        matchId: null,
        audience: null,
        visibility: null,
        videoKey: 'clips/owner/clip1/video.mp4',
        recordedAt: new Date(),
      }),
    );
    await expect(
      solo.service.completeUpload(owner, {
        clipId: 'clip1',
        audience: 'only_me',
        postToGroup: true,
      }),
    ).rejects.toBeInstanceOf(ORPCError);
  });
});

describe('ProofClipsService.listForMatch', () => {
  it('keeps to one day by default and only lists posted clips', async () => {
    const { service, prisma } = createHarness();
    await service.listForMatch(owner, { matchId: 'match1', dayKey: '2026-10-20' });

    const args = prisma.proofClip.findMany.mock.calls[0]?.[0];
    expect(args.where.recordedAt).toEqual({
      gte: new Date('2026-10-20T00:00:00.000Z'),
      lt: new Date('2026-10-20T23:59:59.999Z'),
    });
    expect(args.where.postedToGroupAt).toEqual({ not: null });
    expect(args.take).toBeUndefined();
  });

  it('spans the whole run, newest first and capped, for a finished group', async () => {
    const { service, prisma } = createHarness();
    await service.listForMatch(owner, { matchId: 'match1', allDays: true });

    const args = prisma.proofClip.findMany.mock.calls[0]?.[0];
    expect(args.where.recordedAt).toBeUndefined();
    expect(args.where).toMatchObject({
      matchId: 'match1',
      status: 'ready',
      postedToGroupAt: { not: null },
    });
    expect(args.orderBy).toEqual({ recordedAt: 'desc' });
    expect(args.take).toBe(50);
  });
});
