import * as SecureStore from 'expo-secure-store';

const KEY = 'proof_clip_record_enabled';
const SEEN_EXPLAINER_KEY = 'proof_clip_explainer_seen';

/** Remembered "Record proof" toggle. Off until the person turns it on. */
export async function getProofRecordingEnabled(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(KEY);
  return value === '1';
}

export async function setProofRecordingEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(KEY, enabled ? '1' : '0');
}

export async function hasSeenProofExplainer(): Promise<boolean> {
  return (await SecureStore.getItemAsync(SEEN_EXPLAINER_KEY)) === '1';
}

export async function markProofExplainerSeen(): Promise<void> {
  await SecureStore.setItemAsync(SEEN_EXPLAINER_KEY, '1');
}
