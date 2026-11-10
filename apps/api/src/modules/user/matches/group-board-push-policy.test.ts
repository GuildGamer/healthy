import { describe, expect, it } from 'vitest';
import {
  boardPushEscalationIdempotencyKey,
  boardPushRoutineIdempotencyKey,
  BOARD_PUSH_COALESCE_MS,
} from './constants/group-board-push-policy.js';
import {
  selectPushRecipients,
  shouldPushToRecipient,
} from './group-board-push-policy.js';
import type { RecipientPushState } from './types/group-board-push-policy.js';

function recipient(
  overrides: Partial<RecipientPushState> & Pick<RecipientPushState, 'userId'>,
): RecipientPushState {
  return {
    urgency: 'routine',
    pushedInCoalesceWindow: false,
    ...overrides,
  };
}

describe('shouldPushToRecipient', () => {
  it('lets competitive urgency through even inside the coalesce window', () => {
    for (const urgency of ['ahead', 'tied', 'close'] as const) {
      expect(
        shouldPushToRecipient(
          recipient({
            userId: 'host',
            urgency,
            pushedInCoalesceWindow: true,
          }),
        ),
      ).toBe(true);
    }
  });

  it('suppresses routine when the same actor already pushed in the window', () => {
    expect(
      shouldPushToRecipient(
        recipient({ userId: 'host', pushedInCoalesceWindow: true }),
      ),
    ).toBe(false);
  });

  it('announces routine when the coalesce window is clear', () => {
    expect(shouldPushToRecipient(recipient({ userId: 'host' }))).toBe(true);
  });
});

describe('selectPushRecipients', () => {
  it('pushes competitive and clear routine recipients', () => {
    const decision = selectPushRecipients([
      recipient({ userId: 'host', urgency: 'ahead' }),
      recipient({ userId: 'cam', urgency: 'routine' }),
    ]);

    expect(decision.pushUserIds).toEqual(['host', 'cam']);
  });

  it('keeps competitive and drops coalesced routine', () => {
    const decision = selectPushRecipients([
      recipient({ userId: 'host', urgency: 'ahead', pushedInCoalesceWindow: true }),
      recipient({
        userId: 'cam',
        urgency: 'routine',
        pushedInCoalesceWindow: true,
      }),
    ]);

    expect(decision.pushUserIds).toEqual(['host']);
  });
});

describe('push idempotency keys', () => {
  it('uses a ten-minute coalesce window', () => {
    expect(BOARD_PUSH_COALESCE_MS).toBe(10 * 60 * 1000);
  });

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
