import { type ReactNode, createContext, useContext } from 'react';
import { finishOnCard } from '@/components/challenges/finish-challenge';
import { useActOnChallenge } from '@/components/challenges/useActOnChallenge';
import type { CardActs } from './types/card-acts';

const CardActsContext = createContext<CardActs | null>(null);

/** Holds the acts done on Today's cards, so the toast can sit at the foot of the screen. */
export function CardActsProvider({ children }: { children: ReactNode }) {
  const acts = useActOnChallenge({ onFinished: finishOnCard });
  return <CardActsContext.Provider value={acts}>{children}</CardActsContext.Provider>;
}

export function useCardActs(): CardActs {
  const acts = useContext(CardActsContext);
  if (!acts) {
    throw new Error('useCardActs must be used within CardActsProvider');
  }

  return acts;
}
