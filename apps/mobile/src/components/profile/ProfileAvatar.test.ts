import { avatarNameFor, initialsFor } from './ProfileAvatar';

describe('initialsFor', () => {
  it('uses the first and last name', () => {
    expect(initialsFor('Ada Lovelace')).toBe('AL');
  });

  it('uses one letter when there is a single word', () => {
    expect(initialsFor('Ada')).toBe('A');
  });

  it('returns empty when the name is blank', () => {
    expect(initialsFor('   ')).toBe('');
  });
});

describe('avatarNameFor', () => {
  it('prefers the username over the legal name', () => {
    expect(
      avatarNameFor({ displayName: 'Ada', name: 'Ada Lovelace' }),
    ).toBe('Ada');
  });

  it('falls back to the legal name when no username is set', () => {
    expect(avatarNameFor({ displayName: '  ', name: 'Ada Lovelace' })).toBe(
      'Ada Lovelace',
    );
  });
});
