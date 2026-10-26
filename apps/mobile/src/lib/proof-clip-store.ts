import * as SecureStore from 'expo-secure-store';

const INDEX_KEY = 'proof_clip_local_index_v1';

export type LocalProofClip = {
  clipId: string;
  fileUri: string;
  posterUri: string | null;
  sha256: string;
  byteSize: number;
  durationSeconds: number;
  code: string;
  displayCode: string;
  recordedAt: string;
  userChallengeId: string | null;
  matchId: string | null;
};

type Index = Record<string, LocalProofClip>;

async function readIndex(): Promise<Index> {
  const raw = await SecureStore.getItemAsync(INDEX_KEY);
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw) as Index;
  } catch {
    return {};
  }
}

async function writeIndex(index: Index): Promise<void> {
  await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify(index));
}

export async function saveLocalProofClip(clip: LocalProofClip): Promise<void> {
  const index = await readIndex();
  index[clip.clipId] = clip;
  await writeIndex(index);
}

export async function getLocalProofClip(clipId: string): Promise<LocalProofClip | null> {
  const index = await readIndex();
  return index[clipId] ?? null;
}

export async function removeLocalProofClip(clipId: string): Promise<void> {
  const index = await readIndex();
  delete index[clipId];
  await writeIndex(index);
}

export async function listLocalProofClips(): Promise<LocalProofClip[]> {
  const index = await readIndex();
  return Object.values(index).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}
