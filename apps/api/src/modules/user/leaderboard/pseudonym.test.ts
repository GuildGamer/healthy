import { describe, expect, it } from 'vitest';
import {
  pseudonymAdjectives,
  pseudonymAnimals,
} from './constants/pseudonym-words.js';
import { publicNameFor, pseudonymFor } from './pseudonym.js';

describe('pseudonymFor', () => {
  it('returns the same name for the same id every time', () => {
    expect(pseudonymFor('user-abc')).toBe(pseudonymFor('user-abc'));
  });

  it('builds names only from the published word lists', () => {
    const [adjective, animal] = pseudonymFor('user-abc').split(' ');

    expect(pseudonymAdjectives).toContain(adjective);
    expect(pseudonymAnimals).toContain(animal);
  });

  it('spreads ids across many distinct names', () => {
    const names = new Set(
      Array.from({ length: 200 }, (_unused, index) =>
        pseudonymFor(`user-${index}`),
      ),
    );

    // Far from the 256 possible pairs, but enough that collisions are not the
    // norm — a board of neighbours should not all be Swift Otters.
    expect(names.size).toBeGreaterThan(60);
  });
});

describe('publicNameFor', () => {
  it('prefers a chosen name', () => {
    expect(publicNameFor('user-abc', 'Ada')).toBe('Ada');
  });

  it.each([null, undefined, '', '   '])(
    'falls back to the pseudonym for %p',
    (stored) => {
      expect(publicNameFor('user-abc', stored)).toBe(pseudonymFor('user-abc'));
    },
  );

  it('trims a stored name', () => {
    expect(publicNameFor('user-abc', '  Ada  ')).toBe('Ada');
  });
});
