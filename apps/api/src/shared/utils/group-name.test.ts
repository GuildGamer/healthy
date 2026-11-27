import { describe, expect, it } from 'vitest';
import { groupNameFor } from './group-name.js';
import { pseudonymFor } from './pseudonym.js';

describe('groupNameFor', () => {
  it('uses the first word of the account name', () => {
    expect(
      groupNameFor({
        id: 'u1',
        name: 'Ada Lovelace',
        profile: { displayName: 'Quiet Otter' },
      }),
    ).toBe('Ada');
  });

  it('falls back to the display name when there is no account name', () => {
    expect(
      groupNameFor({
        id: 'u1',
        name: null,
        profile: { displayName: 'Bee' },
      }),
    ).toBe('Bee');
  });

  it('falls back to the pseudonym when nothing else is set', () => {
    expect(groupNameFor({ id: 'u1', name: null, profile: null })).toBe(
      pseudonymFor('u1'),
    );
  });
});
