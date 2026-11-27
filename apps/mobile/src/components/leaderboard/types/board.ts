import type { LeaderboardEntry } from '@product/client';
import type { GlyphName } from '@/components/icons';

export type BoardFact = { glyph: GlyphName; line: string; detail: string };

export type BoardRow = { kind: 'entry'; entry: LeaderboardEntry } | { kind: 'gap'; key: string };

/** Where the caller sits this week, as far as the board can say. */
export type BoardStanding =
  | { kind: 'hidden' }
  | { kind: 'unranked' }
  | { kind: 'ranked'; rank: number; ahead: LeaderboardEntry | null; points: number };
