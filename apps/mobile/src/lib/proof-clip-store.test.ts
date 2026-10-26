import * as SecureStore from 'expo-secure-store';
import {
  getLocalProofClip,
  listLocalProofClips,
  markLocalProofClipServerRecorded,
  pruneLocalProofClips,
  removeLocalProofClip,
  saveLocalProofClip,
  type LocalProofClip,
} from './proof-clip-store';

const getItemAsync = jest.mocked(SecureStore.getItemAsync);
const setItemAsync = jest.mocked(SecureStore.setItemAsync);

function clip(overrides: Partial<LocalProofClip> = {}): LocalProofClip {
  return {
    clipId: 'clip-1',
    fileUri: 'file:///tmp/clip.mp4',
    posterUri: null,
    sha256: 'a'.repeat(64),
    byteSize: 1024,
    durationSeconds: 12,
    count: 10,
    code: 'ABCDEFG',
    displayCode: 'ABCD-EFG',
    recordedAt: new Date().toISOString(),
    userChallengeId: 'uc-1',
    matchId: null,
    serverRecorded: false,
    ...overrides,
  };
}

describe('proof-clip-store', () => {
  beforeEach(() => {
    getItemAsync.mockReset();
    setItemAsync.mockReset();
    getItemAsync.mockResolvedValue(null);
    setItemAsync.mockResolvedValue(undefined);
  });

  it('round-trips serverRecorded on save and mark', async () => {
    const saved = clip({ serverRecorded: false });
    await saveLocalProofClip(saved);

    const written = JSON.parse(String(setItemAsync.mock.calls.at(-1)?.[1]));
    expect(written['clip-1'].serverRecorded).toBe(false);

    getItemAsync.mockResolvedValue(JSON.stringify(written));
    await markLocalProofClipServerRecorded('clip-1');

    const marked = JSON.parse(String(setItemAsync.mock.calls.at(-1)?.[1]));
    expect(marked['clip-1'].serverRecorded).toBe(true);
  });

  it('normalizes missing serverRecorded to false', async () => {
    const legacy = { ...clip(), serverRecorded: undefined };
    getItemAsync.mockResolvedValue(JSON.stringify({ 'clip-1': legacy }));

    const loaded = await getLocalProofClip('clip-1');
    expect(loaded?.serverRecorded).toBe(false);
  });

  it('prunes clips older than 30 days', async () => {
    const old = clip({
      clipId: 'old',
      recordedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const fresh = clip({ clipId: 'fresh' });
    getItemAsync.mockResolvedValue(JSON.stringify({ old, fresh }));

    const pruned = await pruneLocalProofClips();
    expect(Object.keys(pruned)).toEqual(['fresh']);
  });

  it('lists newest first after prune', async () => {
    const older = clip({
      clipId: 'a',
      recordedAt: '2026-10-01T00:00:00.000Z',
    });
    const newer = clip({
      clipId: 'b',
      recordedAt: '2026-10-20T00:00:00.000Z',
    });
    getItemAsync.mockResolvedValue(JSON.stringify({ a: older, b: newer }));

    const listed = await listLocalProofClips();
    expect(listed.map((item) => item.clipId)).toEqual(['b', 'a']);
  });

  it('removes a clip from the index', async () => {
    getItemAsync.mockResolvedValue(JSON.stringify({ 'clip-1': clip() }));
    await removeLocalProofClip('clip-1');
    const written = JSON.parse(String(setItemAsync.mock.calls.at(-1)?.[1]));
    expect(written['clip-1']).toBeUndefined();
  });
});
