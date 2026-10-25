import { firstNameFromDisplay } from './first-name.js';
import { publicNameFor } from './pseudonym.js';

export type GroupNameUser = {
  id: string;
  name?: string | null;
  profile?: { displayName?: string | null } | null;
};

/**
 * What friends see inside a group contest: the account first name.
 * Falls back to the leaderboard display name, then the pseudonym.
 */
export function groupNameFor(user: GroupNameUser): string {
  const fromAccount = firstNameFromDisplay(user.name);
  if (fromAccount) {
    return fromAccount;
  }

  return publicNameFor(user.id, user.profile?.displayName);
}
