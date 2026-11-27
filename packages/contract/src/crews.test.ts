import { describe, expect, it } from 'vitest';
import { CREW_NAME_MAX, crewLabel, crewNameSchema } from './crews';

describe('crewLabel', () => {
  it('names a two-person crew in full', () => {
    expect(crewLabel(['Tunde', 'Ada'])).toBe('Tunde, Ada');
  });

  it('counts the rest once the name would get long', () => {
    expect(crewLabel(['Tunde', 'Ada', 'Bee'])).toBe('Tunde, Ada +1');
    expect(crewLabel(['Tunde', 'Ada', 'Bee', 'Cam'])).toBe('Tunde, Ada +2');
  });

  it('falls back rather than producing an empty label', () => {
    expect(crewLabel(['Tunde'])).toBe('Tunde');
    expect(crewLabel([])).toBe('Crew');
  });
});

describe('crewNameSchema', () => {
  it('trims a rename and rejects a blank one', () => {
    expect(crewNameSchema.parse('  Gym lads  ')).toBe('Gym lads');
    expect(crewNameSchema.safeParse('   ').success).toBe(false);
  });

  it('keeps a name from growing into a bio', () => {
    expect(crewNameSchema.safeParse('a'.repeat(CREW_NAME_MAX)).success).toBe(
      true,
    );
    expect(
      crewNameSchema.safeParse('a'.repeat(CREW_NAME_MAX + 1)).success,
    ).toBe(false);
  });
});
