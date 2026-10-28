import type { TodayChallenge } from '@product/client';
import { type ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { WATER_UNDO_MS } from '@/components/challenges/constants/water';
import { finishOnCard } from '@/components/challenges/finish-challenge';
import { useCompleteChallenge } from '@/components/challenges/useCompleteChallenge';
import { useWaterGlasses } from '@/components/challenges/useWaterGlasses';
import {
  glassLoggedLine,
  waterGlassCount,
  waterGlassGoal,
} from '@/components/challenges/water-glasses';
import { FINISH_COPY } from './constants/finish-copy';
import type { CardActs, CardToast } from './types/card-acts';

const CardActsContext = createContext<CardActs | null>(null);

function useCardToast() {
  const [toast, setToast] = useState<CardToast | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = setTimeout(() => setToast(null), WATER_UNDO_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return [toast, setToast] as const;
}

function useCardActsState(): CardActs {
  const water = useWaterGlasses();
  const complete = useCompleteChallenge();
  const [toast, setToast] = useCardToast();
  const dismissToast = () => setToast(null);
  const showFailure = () => setToast({ message: FINISH_COPY.saveFailed, action: null });

  function setGlasses(challenge: TodayChallenge, glasses: number) {
    water.setGlasses(challenge, glasses, {
      onFinished: (result) => finishOnCard(result, { kind: 'water', glasses }),
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
        label: FINISH_COPY.undo,
        onPress: () => {
          setGlasses(challenge, glasses - 1);
          setToast(null);
        },
      },
    });
  }

  return {
    addGlass,
    removeGlass: (challenge) => setGlasses(challenge, waterGlassCount(challenge) - 1),
    markDone: (challenge) =>
      complete.mutate(
        { occurrence: challenge, payload: {} },
        {
          onSuccess: (result) => finishOnCard(result, { kind: 'checkedIn' }),
          onError: showFailure,
        },
      ),
    isActing: (occurrenceId) =>
      water.isFinishing(occurrenceId) ||
      (complete.isPending && complete.variables?.occurrence.id === occurrenceId),
    toast,
    dismissToast,
  };
}

/** Holds the acts done on Today's cards, so the toast can sit at the foot of the screen. */
export function CardActsProvider({ children }: { children: ReactNode }) {
  const acts = useCardActsState();
  return <CardActsContext.Provider value={acts}>{children}</CardActsContext.Provider>;
}

export function useCardActs(): CardActs {
  const acts = useContext(CardActsContext);
  if (!acts) {
    throw new Error('useCardActs must be used within CardActsProvider');
  }

  return acts;
}
