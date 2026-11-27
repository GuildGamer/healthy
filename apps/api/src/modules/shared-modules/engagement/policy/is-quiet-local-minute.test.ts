import { describe, expect, it } from 'vitest';
import { isQuietLocalMinute } from './is-quiet-local-minute.js';

describe('isQuietLocalMinute', () => {
  it('is quiet from 21:00 through 07:59', () => {
    expect(isQuietLocalMinute(21 * 60)).toBe(true);
    expect(isQuietLocalMinute(23 * 60 + 30)).toBe(true);
    expect(isQuietLocalMinute(0)).toBe(true);
    expect(isQuietLocalMinute(7 * 60 + 59)).toBe(true);
  });

  it('is awake from 08:00 through 20:59', () => {
    expect(isQuietLocalMinute(8 * 60)).toBe(false);
    expect(isQuietLocalMinute(12 * 60)).toBe(false);
    expect(isQuietLocalMinute(20 * 60 + 59)).toBe(false);
  });
});
