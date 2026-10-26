import * as SecureStore from 'expo-secure-store';

const INDEX_KEY = 'proof_clip_local_index_v1';
/** Clips older than this are dropped from the local index (files may already be gone). */
const LOCAL_CLIP_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export type LocalProofClip = {
  clipId: string;
  fileUri: string;
  posterUri: string | null;
  sha256: string;
  byteSize: number;
  durationSeconds: number;
  count: number;
  code: string;
  displayCode: string;
  recordedAt: string;
  userChallengeId: string | null;
  matchId: string | null;
  /**
   * True once `recordProofClip` has succeeded for this clip. Upload retries
   * the record call when this is false.
   */
  serverRecorded: boolean;
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

function normalizeClip(clip: LocalProofClip): LocalProofClip {
  return {
    ...clip,
    count: typeof clip.count === 'number' && Number.isFinite(clip.count) ? clip.count : 0,
    serverRecorded: clip.serverRecorded === true,
  };
}

/** Drops entries older than 30 days so the SecureStore index stays small. */
export async function pruneLocalProofClips(now = Date.now()): Promise<Index> {
  const index = await readIndex();
  const next: Index = {};
  let changed = false;

  for (const [clipId, raw] of Object.entries(index)) {
    const clip = normalizeClip(raw);
    const age = now - Date.parse(clip.recordedAt);
    if (!Number.isFinite(age) || age > LOCAL_CLIP_MAX_AGE_MS) {
      changed = true;
      continue;
    }

    next[clipId] = clip;
    if (raw.serverRecorded !== true && 'serverRecorded' in raw === false) {
      changed = true;
    }
  }

  if (changed || Object.keys(next).length !== Object.keys(index).length) {
    await writeIndex(next);
  }

  return next;
}

export async function saveLocalProofClip(clip: LocalProofClip): Promise<void> {
  const index = await pruneLocalProofClips();
  index[clip.clipId] = normalizeClip(clip);
  await writeIndex(index);
}

export async function markLocalProofClipServerRecorded(clipId: string): Promise<void> {
  const index = await readIndex();
  const existing = index[clipId];
  if (!existing) {
    return;
  }
  index[clipId] = { ...normalizeClip(existing), serverRecorded: true };
  await writeIndex(index);
}

export async function getLocalProofClip(clipId: string): Promise<LocalProofClip | null> {
  const index = await pruneLocalProofClips();
  const clip = index[clipId];
  return clip ? normalizeClip(clip) : null;
}

export async function removeLocalProofClip(clipId: string): Promise<void> {
  const index = await readIndex();
  delete index[clipId];
  await writeIndex(index);
}

export async function listLocalProofClips(): Promise<LocalProofClip[]> {
  const index = await pruneLocalProofClips();
  return Object.values(index)
    .map(normalizeClip)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}
