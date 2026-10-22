import type { GlyphName } from '@/components/icons';

/** Which deck fill a card takes; each matches a kind of challenge on Today. */
export type DeckCardKind = 'bloodPressure' | 'walk' | 'water' | 'strength';

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
 * exists, and they must show offline.
 */
export const WELCOME_DECK_CARDS: readonly DeckCardContent[] = [
  {
    id: 'blood-pressure',
    kind: 'bloodPressure',
    categoryGlyph: 'bloodPressure',
    category: 'Blood pressure',
    when: 'Morning',
    title: 'Check your blood pressure',
    proofGlyph: 'bloodPressure',
    proof: 'From your cuff reading',
  },
  {
    id: 'walk',
    kind: 'walk',
    categoryGlyph: 'walk',
    category: 'Everyday health',
    when: 'Any time',
    title: 'Ten-minute walk',
    proofGlyph: 'walk',
    proof: 'Measured by your phone',
  },
  {
    id: 'water',
    kind: 'water',
    categoryGlyph: 'water',
    category: 'Everyday health',
    when: 'Any time',
    title: 'Log your water',
    proofGlyph: 'check',
    proof: 'Tap to confirm',
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
