import type { MatchDayStrip, MatchHonor } from '@product/contract';
import type { StandingsResult } from '../match-standings.js';

/** A contest's standings and who moved them today, folded from one read of its events. */
export type ScoredMatch = {
  result: StandingsResult;
  doneTodayUserIds: ReadonlySet<string>;
  /** Null for every contest that does not draw its days as squares. */
  dayStrip: MatchDayStrip | null;
  movedDayKeysByUser: ReadonlyMap<string, string[]>;
  /** Finished-group honors; empty while the contest is still open. */
  honors: MatchHonor[];
};
