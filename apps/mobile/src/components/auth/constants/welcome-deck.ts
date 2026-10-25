import type { GlyphName } from '@/components/icons';
import type { DeckCardKind } from '@/components/deck';

export type { DeckCardKind };

export interface DeckCardContent {
  id: string;
  kind: DeckCardKind;
  categoryGlyph: GlyphName;
  category: string;
  when: string;
  title: string;
  proofGlyph: GlyphName;
  proof: string;
}

/**
 * Fixed examples, not anyone's data: nothing is known before an account
 * exists, and they must show offline. Competitive fitness framing — three
 * distinct deck kinds so light rails / dark fills stay visually different.
 */
export const WELCOME_DECK_CARDS: readonly DeckCardContent[] = [
  {
    id: 'pushups-contest',
    kind: 'strength',
    categoryGlyph: 'strength',
    category: 'Push-ups',
    when: 'By Sunday',
    title: 'Most push-ups by Sunday',
    proofGlyph: 'check',
    proof: 'Counted by your camera',
  },
  {
    id: 'plank-contest',
    kind: 'mobility',
    categoryGlyph: 'mobility',
    category: 'Plank',
    when: 'Any time',
    title: 'Longest plank wins',
    proofGlyph: 'check',
    proof: 'Counted by your camera',
  },
  {
    id: 'squats-contest',
    kind: 'gym',
    categoryGlyph: 'gym',
    category: 'Squats',
    when: 'This week',
    title: 'Gym vs office: squats',
    proofGlyph: 'check',
    proof: 'Counted by your camera',
  },
];

/** -1 deals the top card off to the left, 1 to the right. */
export type DealDirection = -1 | 1;

/** How long each example stays on top before the next is dealt. */
export const WELCOME_DECK_DWELL_MS = 3000;
export const WELCOME_DECK_DEAL_MS = 360;
export const WELCOME_DECK_SETTLE_MS = 320;

/** How far each card behind the top one rises, so its edge peeks out. */
export const WELCOME_DECK_SLOT_STEP = 12;
/** Indexed by slot: 0 on top, then each card further behind. */
export const WELCOME_DECK_SLOT_SCALES = [1, 0.95, 0.9] as const;
/** The page colour laid over cards behind, as the board fades them. */
export const WELCOME_DECK_SLOT_VEILS = [0, 0.2, 0.45] as const;

/** A dealt card travels this many deck widths sideways, clear of the screen. */
export const WELCOME_DECK_DEAL_TRAVEL = 1.25;
/** Tilt of the top card when dragged one deck width. */
export const WELCOME_DECK_DRAG_TILT_DEG = 8;
/** A touch becomes a drag only after this much mostly-sideways movement. */
export const WELCOME_DECK_DRAG_CLAIM_PX = 8;
/** Released past this distance or faster than this (px/ms), the card is dealt. */
export const WELCOME_DECK_DEAL_DISTANCE_PX = 70;
export const WELCOME_DECK_DEAL_VELOCITY = 0.5;
