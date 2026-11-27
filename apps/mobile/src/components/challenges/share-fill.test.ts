import { darkDeckCards, lightDeckCards } from '@product/brand';
import {
  SHARE_FILL_OPTIONS,
  defaultShareFillId,
  isShareFillId,
  shareFillStyle,
} from './share-fill';

describe('share-fill', () => {
  it('defaults each poster kind to the matching fill id', () => {
    expect(defaultShareFillId('walk')).toBe('walk');
    expect(defaultShareFillId('streak')).toBe('streak');
    expect(defaultShareFillId('strength')).toBe('strength');
  });

  it('lists night deck fills then Clinic white', () => {
    expect(SHARE_FILL_OPTIONS.map((option) => option.id)).toEqual([
      'walk',
      'water',
      'strength',
      'gym',
      'mobility',
      'bloodPressure',
      'streak',
      'night',
      'clinic',
    ]);
    expect(SHARE_FILL_OPTIONS.find((option) => option.id === 'walk')?.hex).toBe(
      darkDeckCards.walk,
    );
    expect(SHARE_FILL_OPTIONS.at(-1)).toEqual({
      id: 'clinic',
      label: 'Clinic',
      hex: '#FFFFFF',
    });
  });

  it('uses night ink for deck fills and light ink for Clinic', () => {
    expect(shareFillStyle('gym')).toMatchObject({
      backgroundColor: darkDeckCards.gym,
      ink: 'night',
      text: darkDeckCards.text,
      subtext: darkDeckCards.subtext,
      track: darkDeckCards.track,
    });
    expect(shareFillStyle('clinic')).toMatchObject({
      backgroundColor: '#FFFFFF',
      ink: 'clinic',
      text: lightDeckCards.text,
      subtext: lightDeckCards.subtext,
      track: lightDeckCards.track,
    });
  });

  it('recognises known fill ids', () => {
    expect(isShareFillId('walk')).toBe(true);
    expect(isShareFillId('clinic')).toBe(true);
    expect(isShareFillId('unknown')).toBe(false);
  });
});
