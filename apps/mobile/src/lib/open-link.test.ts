import { openHrefFromUrl } from './open-link';

describe('openHrefFromUrl', () => {
  it('maps https and scheme open links onto the day deck', () => {
    expect(openHrefFromUrl('https://beatset.tech/open')).toBe('/(tabs)');
    expect(openHrefFromUrl('https://www.gethealthyapp.com/open')).toBe('/(tabs)');
    expect(openHrefFromUrl('healthy://open')).toBe('/(tabs)');
    expect(openHrefFromUrl('/open')).toBe('/(tabs)');
    expect(openHrefFromUrl('open')).toBe('/(tabs)');
  });

  it('ignores unrelated paths', () => {
    expect(openHrefFromUrl('https://beatset.tech/progress/report')).toBeNull();
    expect(openHrefFromUrl('https://example.com/open')).toBeNull();
    expect(openHrefFromUrl('not a url')).toBeNull();
  });
});
