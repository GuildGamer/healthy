import { ORPCError } from '@orpc/server';
import {
  assertDraftMatchesKind,
  challengeDraftSchema,
  type ChallengeDraft,
} from '@product/contract';

export function parseStoredDraft(value: unknown): ChallengeDraft | null {
  if (value == null) {
    return null;
  }

  const parsed = challengeDraftSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function requireMatchingDraft(
  completionKind: string,
  draft: ChallengeDraft,
): ChallengeDraft {
  try {
    assertDraftMatchesKind(completionKind, draft);
  } catch {
    throw new ORPCError('BAD_REQUEST', {
      message: 'That draft does not belong to this challenge',
    });
  }

  return draft;
}
