import { describe, expect, it } from 'vitest';
import {
  boardPushEscalationIdempotencyKey,
  boardPushRoutineIdempotencyKey,
  busyVelocityThreshold,
} from './constants/group-board-push-policy.js';
import {
  rankRecipientsForBusyFanOut,
  resolveGroupPushMode,
  rivalryWeightForBusyFanOut,
  selectPushRecipients,
  shouldPushToRecipient,
} from './group-board-push-policy.js';
import type { RecipientPushState } from './types/group-board-push-policy.js';

function recipient(
  overrides: Partial<RecipientPushState> & Pick<RecipientPushState, 'userId'>,
): RecipientPushState {
  return {
    urgency: 'routine',
    rank: 2,
    actorRank: 1,
    pushedInCoalesceWindow: false,
    ...overrides,
  };
}

describe('resolveGroupPushMode', () => {
  it('is grow when the group is small and quiet', () => {
    expect(
      resolveGroupPushMode({
        acceptedCount: 4,
        attemptsLast60m: 1,
        attemptsLast24h: 2,
      }),
    ).toBe('grow');
  });

  it('is busy when accepted seats hit the large-group floor', () => {
    expect(
      resolveGroupPushMode({
        acceptedCount: 10,
        attemptsLast60m: 0,
        attemptsLast24h: 0,
      }),
    ).toBe('busy');
  });

  it('stays grow for a small group below the busy velocity floor', () => {
    expect(
      resolveGroupPushMode({
        acceptedCount: 4,
        attemptsLast60m: 3,
        attemptsLast24h: 3,
      }),
    ).toBe('grow');
  });

  it('is busy when 60-minute velocity trips even for a small group', () => {
    expect(
      resolveGroupPushMode({
        acceptedCount: 4,
        attemptsLast60m: 10,
        attemptsLast24h: 10,
      }),
    ).toBe('busy');
  });

  it('is standard when mid-size or grow velocity is spent', () => {
    expect(
      resolveGroupPushMode({
        acceptedCount: 6,
        attemptsLast60m: 1,
        attemptsLast24h: 2,
      }),
    ).toBe('standard');

    expect(
      resolveGroupPushMode({
        acceptedCount: 4,
        attemptsLast60m: 1,
        attemptsLast24h: 8,
      }),
    ).toBe('standard');
  });

  it('scales the busy velocity floor with group size', () => {
    expect(busyVelocityThreshold(4)).toBe(10);
    expect(busyVelocityThreshold(20)).toBe(10);
    expect(busyVelocityThreshold(30)).toBe(12);
  });
});

describe('shouldPushToRecipient', () => {
  it('lets competitive urgency through in every mode', () => {
    for (const mode of ['grow', 'standard', 'busy'] as const) {
      expect(
        shouldPushToRecipient(
          mode,
          recipient({
            userId: 'host',
            urgency: 'ahead',
            pushedInCoalesceWindow: true,
          }),
        ),
      ).toBe(true);
    }
  });

  it('suppresses routine pushes only in busy', () => {
    expect(shouldPushToRecipient('busy', recipient({ userId: 'host' }))).toBe(
      false,
    );
    expect(
      shouldPushToRecipient('standard', recipient({ userId: 'host' })),
    ).toBe(true);
  });

  it('allows one routine push in grow and standard, then coalesces', () => {
    for (const mode of ['grow', 'standard'] as const) {
      expect(shouldPushToRecipient(mode, recipient({ userId: 'host' }))).toBe(
        true,
      );
      expect(
        shouldPushToRecipient(
          mode,
          recipient({ userId: 'host', pushedInCoalesceWindow: true }),
        ),
      ).toBe(false);
    }
  });
});

describe('busy fan-out', () => {
  it('ranks ahead of the leader above a far routine trail', () => {
    const ahead = recipient({
      userId: 'leader',
      urgency: 'ahead',
      rank: 1,
      actorRank: 2,
    });
    const routine = recipient({
      userId: 'far',
      urgency: 'routine',
      rank: 8,
      actorRank: 2,
    });

    expect(rivalryWeightForBusyFanOut(ahead)).toBeGreaterThan(
      rivalryWeightForBusyFanOut(routine),
    );
    expect(rankRecipientsForBusyFanOut([routine, ahead])[0]?.userId).toBe(
      'leader',
    );
  });

  it('keeps only the top three push slots in busy mode', () => {
    const candidates = [
      recipient({ userId: 'a', urgency: 'ahead', rank: 1, actorRank: 2 }),
      recipient({ userId: 'b', urgency: 'tied', rank: 2, actorRank: 2 }),
      recipient({ userId: 'c', urgency: 'close', rank: 3, actorRank: 2 }),
      recipient({ userId: 'd', urgency: 'close', rank: 4, actorRank: 2 }),
      recipient({ userId: 'e', urgency: 'routine', rank: 5, actorRank: 2 }),
    ];

    const decision = selectPushRecipients('busy', candidates);

    expect(decision.mode).toBe('busy');
    expect(decision.pushUserIds).toHaveLength(3);
    expect(decision.pushUserIds).toEqual(['a', 'b', 'c']);
    expect(decision.pushUserIds).not.toContain('e');
  });

  it('pushes every grow-eligible recipient, including one routine', () => {
    const decision = selectPushRecipients('grow', [
      recipient({ userId: 'host', urgency: 'ahead', rank: 2, actorRank: 1 }),
      recipient({ userId: 'cam', urgency: 'routine', rank: 3, actorRank: 1 }),
    ]);

    expect(decision.pushUserIds).toEqual(['host', 'cam']);
  });

  it('pushes competitive and routine recipients in standard mode', () => {
    const decision = selectPushRecipients('standard', [
      recipient({ userId: 'host', urgency: 'ahead', rank: 2, actorRank: 1 }),
      recipient({ userId: 'cam', urgency: 'routine', rank: 3, actorRank: 1 }),
    ]);

    expect(decision.pushUserIds).toEqual(['host', 'cam']);
  });
});

describe('push idempotency keys', () => {
  it('scopes routine coalesce by actor, recipient and day', () => {
    expect(boardPushRoutineIdempotencyKey('m1', 'bee', 'host', '2026-10-26')).toBe(
      'match_board_push:m1:bee:host:2026-10-26',
    );
  });

  it('scopes escalation by attempt', () => {
    expect(boardPushEscalationIdempotencyKey('m1', 'a1', 'host')).toBe(
      'match_board_push:m1:a1:host',
    );
  });
});
