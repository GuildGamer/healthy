import {
  clearWalkOfferSession,
  ensureWalkOfferSession,
  localWalkOfferDayKey,
  readWalkOfferSession,
  writeWalkOfferSession,
} from '@/lib/walk-offer-session';
import { emptyWalkOfferBout } from '@/lib/walk-offer-bout';

const goal = {
  challengeId: 'c-walk',
  userChallengeId: 'uc-walk',
  targetDurationMinutes: 10,
  dayKey: '2026-11-01',
};

describe('walk-offer-session', () => {
  beforeEach(async () => {
    await clearWalkOfferSession();
  });

  it('round-trips a session through the document file', async () => {
    await writeWalkOfferSession({ goal, bout: emptyWalkOfferBout() });
    await expect(readWalkOfferSession()).resolves.toEqual({
      goal,
      bout: { movingSeconds: 0, lastFix: null },
    });
  });

  it('keeps an in-progress bout when ensuring the same goal', async () => {
    await writeWalkOfferSession({
      goal,
      bout: {
        movingSeconds: 40,
        lastFix: { latitude: 1, longitude: 2, recordedAt: 9 },
      },
    });

    const next = await ensureWalkOfferSession({ ...goal, targetDurationMinutes: 12 });
    expect(next.bout.movingSeconds).toBe(40);
    expect(next.goal.targetDurationMinutes).toBe(12);
  });

  it('resets the bout when the goal occurrence changes', async () => {
    await writeWalkOfferSession({
      goal,
      bout: { movingSeconds: 40, lastFix: null },
    });

    const next = await ensureWalkOfferSession({
      ...goal,
      userChallengeId: 'uc-other',
    });
    expect(next.bout.movingSeconds).toBe(0);
  });

  it('formats the local calendar day as YYYY-MM-DD', () => {
    expect(localWalkOfferDayKey(new Date(2026, 10, 1))).toBe('2026-11-01');
  });
});
