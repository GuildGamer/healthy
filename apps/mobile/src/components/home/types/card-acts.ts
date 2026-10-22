import type { TodayChallenge } from '@product/client';

/** A short line at the foot of Today, sometimes with a way to take the act back. */
export type CardToast = {
  message: string;
  action: { label: string; onPress: () => void } | null;
};

/** The acts done on a card itself, without leaving Today. */
export type CardActs = {
  addGlass: (challenge: TodayChallenge) => void;
  removeGlass: (challenge: TodayChallenge) => void;
  markDone: (challenge: TodayChallenge) => void;
  isActing: (occurrenceId: string) => boolean;
  toast: CardToast | null;
  dismissToast: () => void;
};
