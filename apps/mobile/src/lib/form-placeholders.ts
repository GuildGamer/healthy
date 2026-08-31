/**
 * Quirky auth placeholders — picked once per form mount so the hint feels
 * alive without changing under the user’s thumbs.
 */

/** Whole addresses, written as jokes people might actually type. */
const EMAIL_PLACEHOLDERS = [
  'hello@latermail.com',
  'notspam@probably.com',
  'me@finally.here',
  'hi@thisisme.com',
  'realperson@yes.com',
  'inbox@naptime.com',
  'mail@walking.com',
  'hey@hydrated.com',
  'you@foundme.com',
  'alive@andwell.com',
  'steps@counted.com',
  'coffee@thenwalk.com',
] as const;

const NAME_PLACEHOLDERS = [
  'Ada Lovelace',
  'Jordan Miles',
  'Sam River',
  'Casey Bloom',
  'Riley Quinn',
  'Alex Harbor',
  'Morgan Finch',
  'Jamie Frost',
] as const;

function pick<T>(items: readonly T[], random: () => number): T {
  const index = Math.floor(random() * items.length);
  return items[Math.min(index, items.length - 1)]!;
}

export function quirkyEmailPlaceholder(random: () => number = Math.random): string {
  return pick(EMAIL_PLACEHOLDERS, random);
}

export function quirkyNamePlaceholder(random: () => number = Math.random): string {
  return pick(NAME_PLACEHOLDERS, random);
}
