import { darkDeckCards, lightDeckCards } from '@product/brand';
import type { SharePosterKind } from './types/share-poster';

/** Colour a share poster can take. Night deck fills plus Clinic white. */
export type ShareFillId =
  | 'walk'
  | 'water'
  | 'strength'
  | 'gym'
  | 'mobility'
  | 'bloodPressure'
  | 'streak'
  | 'night'
  | 'clinic';

export type ShareFillInk = 'night' | 'clinic';

export type ShareFillOption = {
  id: ShareFillId;
  label: string;
  hex: string;
};

/**
 * Ordered swatches for the share colour carousel. Hexes are the Healthy-night
 * deck fills so exports stay on-brand regardless of the phone's mode.
 */
export const SHARE_FILL_OPTIONS: readonly ShareFillOption[] = [
  { id: 'walk', label: 'Walk', hex: darkDeckCards.walk },
  { id: 'water', label: 'Water', hex: darkDeckCards.water },
  { id: 'strength', label: 'Strength', hex: darkDeckCards.strength },
  { id: 'gym', label: 'Gym', hex: darkDeckCards.gym },
  { id: 'mobility', label: 'Mobility', hex: darkDeckCards.mobility },
  { id: 'bloodPressure', label: 'BP', hex: darkDeckCards.bloodPressure },
  { id: 'streak', label: 'Streak', hex: darkDeckCards.streak },
  { id: 'night', label: 'Night', hex: darkDeckCards.night },
  { id: 'clinic', label: 'Clinic', hex: '#FFFFFF' },
] as const;

const FILL_BY_ID: Record<ShareFillId, ShareFillOption> = Object.fromEntries(
  SHARE_FILL_OPTIONS.map((option) => [option.id, option]),
) as Record<ShareFillId, ShareFillOption>;

/** Poster kind maps 1:1 onto a fill id (streak included). */
export function defaultShareFillId(kind: SharePosterKind): ShareFillId {
  return kind;
}

export function isShareFillId(value: string): value is ShareFillId {
  return Object.prototype.hasOwnProperty.call(FILL_BY_ID, value);
}

/** Background and type ink for a chosen swatch. */
export function shareFillStyle(id: ShareFillId): {
  backgroundColor: string;
  ink: ShareFillInk;
  text: string;
  subtext: string;
  track: string;
} {
  const option = FILL_BY_ID[id];
  if (id === 'clinic') {
    return {
      backgroundColor: option.hex,
      ink: 'clinic',
      text: lightDeckCards.text,
      subtext: lightDeckCards.subtext,
      track: lightDeckCards.track,
    };
  }

  return {
    backgroundColor: option.hex,
    ink: 'night',
    text: darkDeckCards.text,
    subtext: darkDeckCards.subtext,
    track: darkDeckCards.track,
  };
}
