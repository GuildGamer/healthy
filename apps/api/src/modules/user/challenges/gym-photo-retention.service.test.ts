import { describe, expect, it, vi } from 'vitest';
import { GymPhotoRetentionService } from './gym-photo-retention.service.js';

describe('GymPhotoRetentionService', () => {
  it('deletes expired objects and clears the occurrence keys', async () => {
    const update = vi.fn().mockResolvedValue({});
    const prisma = {
      userChallenge: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'uc1', photoKey: 'gym-photos/u1/uc1.jpg' },
          { id: 'uc2', photoKey: 'gym-photos/u1/uc2.jpg' },
        ]),
        update,
      },
    };
    const storage = {
      delete: vi.fn().mockResolvedValue(undefined),
      put: vi.fn(),
      presignPut: vi.fn(),
      presignGet: vi.fn(),
      head: vi.fn(),
    };
    const service = new GymPhotoRetentionService(
      prisma as never,
      storage as never,
      { schedulerMode: 'in_process' } as never,
    );

    await expect(service.sweep(new Date('2026-11-24T00:00:00.000Z'))).resolves.toEqual({
      objectsDeleted: 2,
      rowsCleared: 2,
    });
    expect(storage.delete).toHaveBeenCalledWith('gym-photos/u1/uc1.jpg');
    expect(update).toHaveBeenCalledWith({
      where: { id: 'uc1' },
      data: { photoKey: null, photoExpiresAt: null },
    });
  });
});
