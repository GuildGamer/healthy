import type { DeckCardKind } from '@/components/deck';

/** Deck activity colour, or the streak fill for period "days active" reports. */
export type SharePosterKind = DeckCardKind | 'streak';

/** What a share image shows: what you did and your run, never a health reading. */
export type SharePoster = {
  kind: SharePosterKind;
  /** Top-left of the poster, such as "Push-ups". */
  label: string;
  /** The big number, such as "22", or a quiet word such as "Logged". */
  value: string;
  /** Under the number, such as "push-ups, counted by camera". */
  unit: string;
  /** When the finish happened. Absent means the poster is for right now. */
  when?: string;
  /** Top-right; defaults to the weekday of `when` (or today). */
  corner?: string;
};
