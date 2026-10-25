import { describe, expect, it } from 'vitest';
import { firstNameFromDisplay } from './first-name.js';

describe('firstNameFromDisplay', () => {
  it('returns the first word of a real name', () => {
    expect(firstNameFromDisplay('Ada Lovelace')).toBe('Ada');
  });

  it('rejects emails and blanks', () => {
    expect(firstNameFromDisplay('ada@example.com')).toBeNull();
    expect(firstNameFromDisplay('')).toBeNull();
    expect(firstNameFromDisplay(null)).toBeNull();
  });
});
