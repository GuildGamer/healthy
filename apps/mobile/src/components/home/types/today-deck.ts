import type {
  MatchListItem,
  MatchMove,
  TodayChallenge,
  TodayOccurrenceDetail,
} from '@product/client';
import type { TodayWin } from '@/components/challenges/challenge-list-layout';
import type { DeckCardKind } from '@/components/deck';
import type { GlyphName } from '@/components/icons';
import type { HealthTip } from '@/components/tips';
import type { ChallengeFinish } from '@/lib/challenge-finish-session';

export type TallySegment = {
  id: string;
  kind: DeckCardKind;
  /** 0 to 1: how much of the segment is filled. */
  fill: number;
  isDone: boolean;
};

/** Replaces the position in a card's corner. */
export type DeckCardTag = 'extra' | 'week' | 'month';

export type ChallengeDeckItem = {
  type: 'challenge';
  key: string;
  challenge: TodayChallenge;
  kind: DeckCardKind;
  /** 1-based place among today's challenges, as in "3 of 4". */
  position: number;
  tag: DeckCardTag | null;
  /** Today's tip, when it is about this card's condition. */
  tip: HealthTip | null;
  /** Null until the details land, so the card draws without them first. */
  detail: TodayOccurrenceDetail | null;
};

/** Which days of this week a card's challenge was done, for its strip. */
export type DeckWeek = {
  dayKeys: string[];
  todayKey: string;
};

/** Someone in a live group moving on its board, as Today mentions it. */
export type GroupPresence = MatchMove & {
  /** What the move was, such as "did a set". */
  activity: string;
};

export type GroupDeckItem = {
  type: 'group';
  key: string;
  match: MatchListItem;
  kind: DeckCardKind;
};

export type DayDoneDeckItem = {
  type: 'dayDone';
  key: string;
};

/** A card just finished, showing its done side before the deck moves on. */
export type FinishedDeckItem = {
  type: 'finished';
  key: string;
  finish: ChallengeFinish;
  kind: DeckCardKind;
  /** What the done side's button deals next, such as "Next: Log your water". */
  nextLabel: string;
};

export type DeckItem = ChallengeDeckItem | GroupDeckItem | DayDoneDeckItem | FinishedDeckItem;

export type TodayDeck = {
  segments: TallySegment[];
  /** How many segments sit before the free tier's win line, or null without one. */
  winLineAfter: number | null;
  /** In the order they are dealt; the first is on top. */
  items: DeckItem[];
  done: ChallengeDeckItem[];
  completedCount: number;
  totalCount: number;
  openCount: number;
  win: TodayWin;
  isDayDone: boolean;
  pointsToday: number;
  /** Free member, win locked, extras still open. */
  showsMembershipLine: boolean;
  /** Days of the current week, Monday first; null until the details land. */
  weekDayKeys: string[] | null;
  /** The latest move by someone else across live groups today. */
  presence: GroupPresence | null;
};

export type DeckMeasure =
  | { kind: 'count'; value: number; total: number; unit: string; fill: number }
  | { kind: 'status'; line: string; note: string | null }
  | { kind: 'photo'; line: string }
  | { kind: 'checkRing' };

export type DeckProof = {
  glyph: GlyphName;
  line: string;
};

export type TallyLabel = {
  strong: string;
  rest: string | null;
};

/** A challenge Today should open on, and how to say it has been. */
export type TodayFocus = {
  challengeId: string;
  onHandled: () => void;
};
