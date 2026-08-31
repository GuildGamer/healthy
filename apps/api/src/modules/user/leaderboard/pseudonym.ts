import {
  pseudonymAdjectives,
  pseudonymAnimals,
} from './constants/pseudonym-words.js';

/**
 * FNV-1a. Not a security primitive — it only needs to spread ids evenly across
 * the word lists and give the same answer on every request, so a user's name
 * never changes between page loads or between servers.
 */
function hash(value: string): number {
  let result = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 0x01000193);
  }
  return result >>> 0;
}

export function pseudonymFor(userId: string): string {
  const seed = hash(userId);
  const adjective =
    pseudonymAdjectives[seed % pseudonymAdjectives.length] ?? 'Quiet';
  const animal =
    pseudonymAnimals[
      Math.floor(seed / pseudonymAdjectives.length) % pseudonymAnimals.length
    ] ?? 'Otter';

  return `${adjective} ${animal}`;
}

/** The stored name when the user has chosen one, otherwise their pseudonym. */
export function publicNameFor(
  userId: string,
  storedDisplayName: string | null | undefined,
): string {
  const trimmed = storedDisplayName?.trim();
  return trimmed ? trimmed : pseudonymFor(userId);
}
