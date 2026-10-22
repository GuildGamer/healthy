import type { CatalogChallenge, ChallengeFrequency, TodayChallenge } from '@product/client';

/** A challenge's standing this period, drawn as an empty, part-filled, or ticked circle. */
export type RoutineState = 'open' | 'part' | 'done';

export type RoutineRow = {
  challenge: CatalogChallenge;
  /** This period's occurrence, once Today has dealt it. */
  occurrence: TodayChallenge | null;
  state: RoutineState;
  /** Where it stands and when it nudges you, such as "4 of 10 min · reminder 12:30". */
  meta: string;
};

export type RoutineGroup = {
  frequency: ChallengeFrequency;
  rows: RoutineRow[];
  doneCount: number;
};

export type RoutineLayout = {
  groups: RoutineGroup[];
  /** On your list but locked since membership ended; kept in sight rather than dropped. */
  paused: CatalogChallenge[];
  isEmpty: boolean;
};

export type CatalogFilter = 'all' | CatalogChallenge['category'];

export type CatalogSection = {
  category: CatalogChallenge['category'];
  challenges: CatalogChallenge[];
};
