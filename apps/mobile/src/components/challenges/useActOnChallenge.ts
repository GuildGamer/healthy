import type { CompleteChallengeOutput, TodayChallenge } from '@product/client';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import type { ChallengeFinishOutcome } from '@/lib/challenge-finish-session';
import { resolveChallengeAct } from './challenge-act';
import { WATER_UNDO_MS } from './constants/water';
import { useAdvanceChallenge } from './useAdvanceChallenge';
import { useCompleteChallenge } from './useCompleteChallenge';
import { useWaterGlasses } from './useWaterGlasses';
import {
  glassLoggedLine,
  waterGlassCount,
  waterGlassGoal,
} from './water-glasses';

const ACT_COPY = {
  saveFailed: 'That didn’t save. Try again.',
  undo: 'Undo',
} as const;

export type ActToast = {
  message: string;
  action: { label: string; onPress: () => void } | null;
};

type FinishAct = (result: CompleteChallengeOutput, outcome: ChallengeFinishOutcome) => void;

type UseActOnChallengeOptions = {
  /** Where a finished check-in or last glass goes: stay on the card, or leave the page. */
  onFinished: FinishAct;
};

function useActToast() {
  const [toast, setToast] = useState<ActToast | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = setTimeout(() => setToast(null), WATER_UNDO_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return [toast, setToast] as const;
}

/**
 * The single "do this challenge" gesture for Today and the challenge page:
 * a glass, a check-in, a dedicated screen, or the status ladder.
 */
export function useActOnChallenge({ onFinished }: UseActOnChallengeOptions) {
  const router = useRouter();
  const water = useWaterGlasses();
  const complete = useCompleteChallenge();
  const { advance, isAdvancing } = useAdvanceChallenge();
  const [toast, setToast] = useActToast();
  const dismissToast = () => setToast(null);
  const showFailure = () => setToast({ message: ACT_COPY.saveFailed, action: null });

  function setGlasses(challenge: TodayChallenge, glasses: number) {
    water.setGlasses(challenge, glasses, {
      onFinished: (result) => onFinished(result, { kind: 'water', glasses }),
      onError: showFailure,
    });
  }

  function addGlass(challenge: TodayChallenge) {
    const glasses = waterGlassCount(challenge) + 1;
    setGlasses(challenge, glasses);

    if (glasses >= waterGlassGoal(challenge)) {
      setToast(null);
      return;
    }

    setToast({
      message: glassLoggedLine(glasses),
      action: {
        label: ACT_COPY.undo,
        onPress: () => {
          setGlasses(challenge, glasses - 1);
          setToast(null);
        },
      },
    });
  }

  function removeGlass(challenge: TodayChallenge) {
    setGlasses(challenge, waterGlassCount(challenge) - 1);
  }

  function markDone(challenge: TodayChallenge) {
    complete.mutate(
      { occurrence: challenge, payload: {} },
      {
        onSuccess: (result) => onFinished(result, { kind: 'checkedIn' }),
        onError: showFailure,
      },
    );
  }

  function act(challenge: TodayChallenge) {
    const next = resolveChallengeAct(challenge);

    if (next.kind === 'addGlass') {
      addGlass(challenge);
      return;
    }

    if (next.kind === 'markDone') {
      markDone(challenge);
      return;
    }

    if (next.kind === 'route') {
      router.push(next.route);
      return;
    }

    if (next.kind === 'advance') {
      advance({ userChallengeId: challenge.id, status: challenge.status });
    }
  }

  function isActing(occurrenceId: string) {
    return (
      water.isFinishing(occurrenceId) ||
      (complete.isPending && complete.variables?.occurrence.id === occurrenceId) ||
      isAdvancing(occurrenceId)
    );
  }

  return {
    act,
    addGlass,
    removeGlass,
    markDone,
    isActing,
    toast,
    dismissToast,
  };
}
