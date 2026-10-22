import type { DeckCardKind } from '@/components/deck';

/** What a share image shows: what you did and your run, never a health reading. */
export type SharePoster = {
  kind: DeckCardKind;
  /** Top-left of the poster, such as "Push-ups". */
  label: string;
  /** The big number, such as "22", or a quiet word such as "Logged". */
  value: string;
  /** Under the number, such as "push-ups, counted by camera". */
  unit: string;
  /** When the finish happened. Absent means the poster is for right now. */
  when?: string;
};
