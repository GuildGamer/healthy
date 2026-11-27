import type { MatchReactionKind, MatchReactionSent, MatchStanding } from '@product/client';
import type { UseMutationResult } from '@tanstack/react-query';
import { useState } from 'react';
import { useDeckToast } from '@/components/deck';
import { formatClockTime } from '@/lib/clock-time';
import { playSentHaptic } from '@/lib/haptics';
import { faceTapFor } from './group-today';
import { BOARD_COPY } from './match-copy';

type ReactInput = { toUserId: string; kind: MatchReactionKind };
type ReactMutation = Pick<
  UseMutationResult<unknown, Error, ReactInput>,
  'mutate' | 'isPending' | 'isError' | 'reset'
>;

function sentLine(name: string, sent: MatchReactionSent): string {
  const time = formatClockTime(new Date(sent.sentAt));
  return sent.kind === 'cheer' ? BOARD_COPY.cheeredAt(name, time) : BOARD_COPY.nudgedAt(time);
}

/**
 * A tap on a face. A lit face is cheered at once, since a cheer is never
 * unwelcome; a dim one opens the nudge sheet first; a second tap the same day
 * only says what was already sent.
 */
export function useFaceTaps(react: ReactMutation) {
  const toast = useDeckToast();
  const [nudgeTarget, setNudgeTarget] = useState<MatchStanding | null>(null);

  function cheer(standing: MatchStanding) {
    react.mutate(
      { toUserId: standing.userId, kind: 'cheer' },
      {
        onSuccess: () => {
          void playSentHaptic();
          toast.show(BOARD_COPY.cheered(standing.displayName));
        },
        onError: () => toast.show(BOARD_COPY.reactionFailed),
      },
    );
  }

  function onTapFace(standing: MatchStanding) {
    const tap = faceTapFor(standing);
    if (tap.kind === 'cheer') {
      cheer(standing);
      return;
    }

    if (tap.kind === 'alreadySent') {
      toast.show(sentLine(standing.displayName, tap.sent));
      return;
    }

    if (tap.kind === 'nudge') {
      react.reset();
      setNudgeTarget(standing);
    }
  }

  function sendNudge() {
    if (!nudgeTarget) {
      return;
    }

    react.mutate(
      { toUserId: nudgeTarget.userId, kind: 'nudge' },
      {
        onSuccess: () => {
          void playSentHaptic();
          setNudgeTarget(null);
        },
      },
    );
  }

  return {
    onTapFace,
    nudgeTarget,
    sendNudge,
    closeNudge: () => setNudgeTarget(null),
    isSendingNudge: react.isPending && nudgeTarget !== null,
    hasNudgeFailed: react.isError && nudgeTarget !== null,
    toast,
  };
}
