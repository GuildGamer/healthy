import { ORPCError } from '@orpc/server';
import { describe, expect, it, vi } from 'vitest';
import { RemindersService } from './reminders.service.js';

const user = { id: 'u1', email: 'a@b.co', name: 'Ada' };

function createPrismaMock(options: {
  enrollment?: { id: string; isActive: boolean } | null;
  reminder?: {
    id: string;
    enrollmentId: string;
    enrollment: { userId: string; challengeId: string };
  } | null;
  existingCount?: number;
  reminders?: Array<{ id: string; minuteOfDay: number }>;
  reminderMinute?: number;
  membershipActive?: boolean;
}) {
  return {
    challengeEnrollment: {
      findUnique: vi.fn().mockResolvedValue(options.enrollment ?? null),
    },
    challengeReminder: {
      count: vi.fn().mockResolvedValue(options.existingCount ?? 0),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUnique: vi.fn().mockResolvedValue(options.reminder ?? null),
      findMany: vi.fn().mockResolvedValue(options.reminders ?? []),
      delete: vi.fn().mockResolvedValue({}),
    },
    userProfile: {
      findUnique: vi.fn().mockResolvedValue(
        options.reminderMinute === undefined && options.membershipActive === undefined
          ? null
          : {
              reminderMinute: options.reminderMinute ?? 1140,
              membershipActive: options.membershipActive ?? false,
            },
      ),
    },
  };
}

describe('RemindersService', () => {
  it('rejects adding a reminder when the caller is not enrolled', async () => {
    const service = new RemindersService(createPrismaMock({}) as never);

    await expect(service.addReminder(user, 'c1', 480)).rejects.toBeInstanceOf(
      ORPCError,
    );
  });

  it('refuses a sixth reminder on the same challenge', async () => {
    const service = new RemindersService(
      createPrismaMock({
        enrollment: { id: 'e1', isActive: true },
        existingCount: 5,
        membershipActive: true,
      }) as never,
    );

    await expect(service.addReminder(user, 'c1', 480)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('requires membership for a second reminder on the free tier', async () => {
    const service = new RemindersService(
      createPrismaMock({
        enrollment: { id: 'e1', isActive: true },
        existingCount: 1,
        membershipActive: false,
      }) as never,
    );

    await expect(service.addReminder(user, 'c1', 480)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('stores a new time and returns the set for that challenge', async () => {
    const prisma = createPrismaMock({
      enrollment: { id: 'e1', isActive: true },
      reminders: [{ id: 'r1', minuteOfDay: 480 }],
    });
    const service = new RemindersService(prisma as never);

    await expect(service.addReminder(user, 'c1', 480)).resolves.toEqual({
      challengeId: 'c1',
      reminders: [{ id: 'r1', minuteOfDay: 480 }],
    });

    expect(prisma.challengeReminder.createMany).toHaveBeenCalledWith({
      data: [{ enrollmentId: 'e1', minuteOfDay: 480 }],
      skipDuplicates: true,
    });
  });

  it('deletes only a reminder the caller owns', async () => {
    const prisma = createPrismaMock({
      reminder: {
        id: 'r1',
        enrollmentId: 'e1',
        enrollment: { userId: 'u1', challengeId: 'c1' },
      },
      reminders: [],
    });
    const service = new RemindersService(prisma as never);

    await expect(service.removeReminder(user, 'r1')).resolves.toEqual({
      challengeId: 'c1',
      reminders: [],
    });
    expect(prisma.challengeReminder.delete).toHaveBeenCalledWith({
      where: { id: 'r1' },
    });
  });

  it('does not delete someone else\'s reminder', async () => {
    const prisma = createPrismaMock({
      reminder: {
        id: 'r1',
        enrollmentId: 'e1',
        enrollment: { userId: 'other', challengeId: 'c1' },
      },
    });
    const service = new RemindersService(prisma as never);

    await expect(service.removeReminder(user, 'r1')).rejects.toBeInstanceOf(
      ORPCError,
    );
    expect(prisma.challengeReminder.delete).not.toHaveBeenCalled();
  });

  it('seeds the profile default minute onto new enrolments', async () => {
    const prisma = createPrismaMock({ reminderMinute: 480 });
    const service = new RemindersService(prisma as never);

    await service.seedDefaultReminders('u1', ['e1', 'e2']);

    expect(prisma.challengeReminder.createMany).toHaveBeenCalledWith({
      data: [
        { enrollmentId: 'e1', minuteOfDay: 480 },
        { enrollmentId: 'e2', minuteOfDay: 480 },
      ],
      skipDuplicates: true,
    });
  });
});
