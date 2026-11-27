import {
  firstNameFrom,
  hasDisallowedCharacter,
  isValidPublicName,
  PUBLIC_NAME_RULE,
} from './public-name';

describe('public name', () => {
  it('follows the contract rule', () => {
    expect(isValidPublicName('Nurul')).toBe(true);
    expect(isValidPublicName('N')).toBe(false);
    expect(isValidPublicName('Nurul!')).toBe(false);
    expect(isValidPublicName('a'.repeat(25))).toBe(false);
    expect(PUBLIC_NAME_RULE).toBe(
      'Use 2 to 24 letters, numbers, spaces, dots, hyphens or underscores.',
    );
  });

  it('flags a symbol straight away', () => {
    expect(hasDisallowedCharacter('Nu')).toBe(false);
    expect(hasDisallowedCharacter('Nu@')).toBe(true);
  });

  it('keeps only a provider first name', () => {
    expect(firstNameFrom('Nurul Masih')).toBe('Nurul');
    expect(firstNameFrom('  Ada  ')).toBe('Ada');
    expect(firstNameFrom('')).toBe('');
    expect(firstNameFrom(null)).toBe('');
    expect(firstNameFrom('J')).toBe('');
  });
});
