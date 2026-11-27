import { ingestWalkOfferFixes } from '@/lib/walk-offer-ingest';
import { scheduleWalkOfferNotification } from '@/lib/walk-offer-notifications';
import {
  clearWalkOfferSession,
  readWalkOfferSession,
  writeWalkOfferSession,
} from '@/lib/walk-offer-session';
import { readWalkOfferRecord, writeWalkOfferRecord } from '@/lib/walk-offer-state';

jest.mock('@/lib/walk-offer-notifications', () => ({
  ensureWalkOfferNotificationCategory: jest.fn(async () => undefined),
  scheduleWalkOfferNotification: jest.fn(async () => undefined),
}));

jest.mock('@/lib/walk-offer-state', () => ({
  readWalkOfferRecord: jest.fn(async () => null),
  writeWalkOfferRecord: jest.fn(async () => undefined),
  walkOfferAlreadyHandled: jest.fn(() => false),
}));

const goal = {
  challengeId: 'c-walk',
  userChallengeId: 'uc-walk',
  targetDurationMinutes: 10,
  dayKey: '2026-11-01',
};

describe('ingestWalkOfferFixes', () => {
  beforeEach(async () => {
    await clearWalkOfferSession();
    jest.mocked(scheduleWalkOfferNotification).mockClear();
    jest.mocked(writeWalkOfferRecord).mockClear();
    jest.mocked(readWalkOfferRecord).mockResolvedValue(null);
  });

  it('accumulates moving seconds across fixes that cover ground', async () => {
    await writeWalkOfferSession({
      goal,
      bout: { movingSeconds: 0, lastFix: null },
    });

    await ingestWalkOfferFixes([
      { latitude: 0, longitude: 0, recordedAt: 0 },
      { latitude: 0, longitude: 0.0002, recordedAt: 80_000 },
    ]);

    const session = await readWalkOfferSession();
    expect(session?.bout.movingSeconds).toBe(80);
    expect(scheduleWalkOfferNotification).not.toHaveBeenCalled();
  });

  it('schedules the offer before marking offered once the threshold is met', async () => {
    await writeWalkOfferSession({
      goal,
      bout: {
        movingSeconds: 140,
        lastFix: { latitude: 0, longitude: 0, recordedAt: 0 },
      },
    });

    await ingestWalkOfferFixes([{ latitude: 0, longitude: 0.0002, recordedAt: 20_000 }]);

    expect(scheduleWalkOfferNotification).toHaveBeenCalledWith(goal);
    expect(writeWalkOfferRecord).toHaveBeenCalledWith({
      dayKey: goal.dayKey,
      userChallengeId: goal.userChallengeId,
      status: 'offered',
    });
    await expect(readWalkOfferSession()).resolves.toBeNull();
  });

  it('leaves the session when scheduling fails so a later fix can retry', async () => {
    jest
      .mocked(scheduleWalkOfferNotification)
      .mockRejectedValueOnce(new Error('notifications denied'));

    await writeWalkOfferSession({
      goal,
      bout: {
        movingSeconds: 140,
        lastFix: { latitude: 0, longitude: 0, recordedAt: 0 },
      },
    });

    await ingestWalkOfferFixes([{ latitude: 0, longitude: 0.0002, recordedAt: 20_000 }]);

    expect(writeWalkOfferRecord).not.toHaveBeenCalled();
    await expect(readWalkOfferSession()).resolves.not.toBeNull();
  });
});
