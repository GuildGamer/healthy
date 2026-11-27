import * as SecureStore from 'expo-secure-store';

/** Keys allow letters, digits, `.`, `-` and `_`, which a cuid already is. */
function seenKey(matchId: string): string {
  return `match_result_seen_${matchId}`;
}

/** Whether this phone has already shown the ending of a group. */
export async function hasSeenMatchResult(matchId: string): Promise<boolean> {
  return (await SecureStore.getItemAsync(seenKey(matchId))) !== null;
}

/** The result moment plays once; after it the board stays as the record. */
export async function markMatchResultSeen(matchId: string): Promise<void> {
  await SecureStore.setItemAsync(seenKey(matchId), '1');
}
