import { syntheticFrontPushupFrame } from './synthetic-front-pushup';
import {
  SUBJECT_LOCK_JUMP_UNLOCK,
  SUBJECT_MOTION_RECENT_MS,
  createSubjectLock,
  tickSubjectLock,
} from './pose-subject-lock';

describe('tickSubjectLock', () => {
  it('acquires a lock on the first usable shoulders and allows feeding', () => {
    const frame = syntheticFrontPushupFrame(0, 0);
    const tick = tickSubjectLock(createSubjectLock(), frame, {
      finishingRep: false,
      nowMs: 1_000,
    });

    expect(tick.isLocked).toBe(true);
    expect(tick.state.hasAnchor).toBe(true);
    expect(tick.mayFeedCounter).toBe(true);
  });

  it('soft-updates the anchor on a small dip without unlocking', () => {
    let state = createSubjectLock();
    const top = tickSubjectLock(state, syntheticFrontPushupFrame(0, 0), {
      finishingRep: false,
      nowMs: 1_000,
    });
    state = top.state;

    const bottom = tickSubjectLock(state, syntheticFrontPushupFrame(40, 1), {
      finishingRep: false,
      nowMs: 1_040,
    });

    expect(bottom.isLocked).toBe(true);
    expect(bottom.state.hasAnchor).toBe(true);
    expect(bottom.mayFeedCounter).toBe(true);
  });

  it('unlocks when the skeleton teleports to another person', () => {
    let state = createSubjectLock();
    const first = tickSubjectLock(state, syntheticFrontPushupFrame(0, 0), {
      finishingRep: false,
      nowMs: 1_000,
    });
    state = first.state;

    const teleported = syntheticFrontPushupFrame(40, 0);
    const shifted = {
      ...teleported,
      points: Object.fromEntries(
        Object.entries(teleported.points).map(([key, point]) => [
          key,
          point ? { ...point, x: point.x + SUBJECT_LOCK_JUMP_UNLOCK + 0.05 } : point,
        ]),
      ),
    };

    const tick = tickSubjectLock(state, shifted as typeof teleported, {
      finishingRep: false,
      nowMs: 1_050,
    });

    expect(tick.isLocked).toBe(false);
    expect(tick.mayFeedCounter).toBe(false);
    expect(tick.state.hasAnchor).toBe(false);
  });

  it('denies enter when the locked subject is still', () => {
    let state = createSubjectLock();
    const first = tickSubjectLock(state, syntheticFrontPushupFrame(0, 0.5), {
      finishingRep: false,
      nowMs: 1_000,
    });
    state = first.state;

    const still = tickSubjectLock(state, syntheticFrontPushupFrame(0, 0.5), {
      finishingRep: false,
      nowMs: 1_000 + SUBJECT_MOTION_RECENT_MS + 50,
    });

    expect(still.isLocked).toBe(true);
    expect(still.subjectMovedRecently).toBe(false);
    expect(still.mayFeedCounter).toBe(false);
  });

  it('allows exit after a dip even if the lock-out pauses still', () => {
    let state = createSubjectLock();
    state = tickSubjectLock(state, syntheticFrontPushupFrame(0, 0), {
      finishingRep: false,
      nowMs: 1_000,
    }).state;

    // Dip while armed — records motionSinceArm.
    const bottom = syntheticFrontPushupFrame(40, 1);
    state = tickSubjectLock(state, bottom, {
      finishingRep: true,
      nowMs: 1_040,
    }).state;

    const paused = tickSubjectLock(state, bottom, {
      finishingRep: true,
      nowMs: 1_040 + SUBJECT_MOTION_RECENT_MS + 80,
    });

    expect(paused.isLocked).toBe(true);
    expect(paused.subjectMovedRecently).toBe(false);
    expect(paused.state.motionSinceArm).toBe(true);
    expect(paused.mayFeedCounter).toBe(true);
  });

  it('fails open when landmarks are missing', () => {
    const tick = tickSubjectLock(createSubjectLock(), null, {
      finishingRep: false,
      nowMs: 1_000,
    });

    expect(tick.isLocked).toBe(true);
    expect(tick.mayFeedCounter).toBe(true);
  });
});
