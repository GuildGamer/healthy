import type { ProofClipAudience } from '@product/client';
import { PROOF_CLIP_POSTER_MAX_BYTES } from '@product/contract/proof-clip-limits';
import { apiClient } from '@/lib/api';
import {
  getLocalProofClip,
  markLocalProofClipPendingUpload,
  markLocalProofClipServerRecorded,
  removeLocalProofClip,
} from '@/lib/proof-clip-store';

export type UploadProofClipInput = {
  clipId: string;
  audience: ProofClipAudience;
  /** Puts the clip on the group board. Distinct from who can check the code. */
  postToGroup?: boolean;
};

/**
 * Uploads a local clip to object storage and marks it ready. Idempotent:
 * repeating complete is a no-op on the server. Retries `recordProofClip` when
 * the set finished offline or the earlier record call failed.
 */
export async function uploadProofClip(input: UploadProofClipInput): Promise<void> {
  const local = await getLocalProofClip(input.clipId);
  if (!local) {
    throw new Error('This clip is no longer on this phone.');
  }

  if (!local.serverRecorded) {
    try {
      await apiClient.recordProofClip({
        clipId: local.clipId,
        sha256: local.sha256,
        byteSize: local.byteSize,
        durationSeconds: local.durationSeconds,
        count: local.count,
      });
      await markLocalProofClipServerRecorded(local.clipId);
    } catch {
      throw new Error(
        'Could not register this clip with the server. It may have expired — try recording again.',
      );
    }
  }

  const poster = await readPoster(local.posterUri);
  const urls = await apiClient.requestProofClipUpload({
    clipId: input.clipId,
    videoByteSize: local.byteSize,
    posterByteSize: poster?.size,
    audience: input.audience,
    postToGroup: input.postToGroup === true,
  });

  const videoResponse = await fetch(local.fileUri);
  const videoBlob = await videoResponse.blob();
  const putVideo = await fetch(urls.video.url, {
    method: 'PUT',
    headers: urls.video.headers,
    body: videoBlob,
  });
  if (!putVideo.ok) {
    throw new Error('Could not upload the clip. Try again.');
  }

  if (urls.poster && poster) {
    const putPoster = await fetch(urls.poster.url, {
      method: 'PUT',
      headers: urls.poster.headers,
      body: poster,
    });
    if (!putPoster.ok) {
      throw new Error('Could not upload the poster. Try again.');
    }
  }

  await apiClient.completeProofClipUpload({
    clipId: input.clipId,
    audience: input.audience,
    postToGroup: input.postToGroup === true,
  });
}

/**
 * Queues an Anyone upload and starts it. On failure the pending flag stays so
 * app open / reconnect can retry. Does not post to a group board.
 */
export async function queueAnyoneProofClipUpload(clipId: string): Promise<boolean> {
  await markLocalProofClipPendingUpload(clipId, {
    audience: 'anyone',
    postToGroup: false,
  });
  try {
    await uploadProofClip({
      clipId,
      audience: 'anyone',
      postToGroup: false,
    });
    await markLocalProofClipPendingUpload(clipId, null);
    return true;
  } catch {
    return false;
  }
}

/** The poster is optional: a missing or oversized one never blocks the clip. */
async function readPoster(posterUri: string | null): Promise<Blob | null> {
  if (!posterUri) {
    return null;
  }
  try {
    const response = await fetch(posterUri);
    const blob = await response.blob();
    if (blob.size === 0 || blob.size > PROOF_CLIP_POSTER_MAX_BYTES) {
      return null;
    }
    return blob;
  } catch {
    return null;
  }
}

export async function discardLocalProofClip(clipId: string): Promise<void> {
  await removeLocalProofClip(clipId);
  try {
    await apiClient.removeProofClip({ clipId });
  } catch {
    // Local discard still wins if the server call fails.
  }
}
