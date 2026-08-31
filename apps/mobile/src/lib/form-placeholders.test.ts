import {
  quirkyEmailPlaceholder,
  quirkyNamePlaceholder,
} from './form-placeholders';

describe('form placeholders', () => {
  it('picks a full witty email, not a dotted mash-up', () => {
    expect(quirkyEmailPlaceholder(() => 0)).toBe('hello@latermail.com');
    expect(quirkyEmailPlaceholder(() => 0.5)).toBe('mail@walking.com');
  });

  it('returns a name from the list', () => {
    expect(quirkyNamePlaceholder(() => 0)).toBe('Ada Lovelace');
  });
});
