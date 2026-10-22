import { parseSharePoster, posterRunLine, sharePosterParams } from './share-poster';

describe('share poster', () => {
  it('survives the trip through route params', () => {
    const poster = {
      kind: 'strength',
      label: 'Push-ups',
      value: '22',
      unit: 'push-ups, counted by camera',
    } as const;

    expect(parseSharePoster(sharePosterParams(poster))).toEqual(poster);
  });

  it('refuses a link without a poster or with an unknown kind', () => {
    expect(parseSharePoster({ kind: 'sleep', label: 'x', value: '1', unit: 'y' })).toBeNull();
    expect(parseSharePoster({})).toBeNull();
  });

  it('names the run only once there is one', () => {
    expect(posterRunLine(0)).toBeNull();
    expect(posterRunLine(1)).toBe('1 day running');
    expect(posterRunLine(7)).toBe('7 days running');
  });

  it('keeps the day a stored finish belongs to', () => {
    const poster = {
      kind: 'walk' as const,
      label: 'Morning walk',
      value: '20',
      unit: 'minutes walked',
      when: '2026-10-20T09:00:00.000Z',
    };

    expect(parseSharePoster(sharePosterParams(poster))).toEqual(poster);
    expect(
      parseSharePoster({ ...sharePosterParams(poster), when: 'not-a-day' })?.when,
    ).toBeUndefined();
  });
});
