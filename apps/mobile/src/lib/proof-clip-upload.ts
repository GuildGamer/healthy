import type { ProofClipAudience } from '@product/client';
import type { MeOutput } from '@product/contract';
import {
  FileSystemSessionType,
  FileSystemUploadType,
  uploadAsync,
} from 'expo-file-system/legacy';
import { apiClient } from '@/lib/api';
import { defaultProofClipLimits } from '@/lib/proof-clip-limits-cache';
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
  /** From `/me` when available; defaults to contract defaults. */
  limits?: MeOutput['proofClipLimits'];
};

/**
 * Uploads a local clip to object storage and marks it ready. Idempotent:
 * repeating complete is a no-op on the server. Retries `recordProofClip` when
 * the set finished offline or the earlier record call failed.
 */
export async function uploadProofClip(input: UploadProofClipInput): Promise<void> {
  const limits = input.limits ?? defaultProofClipLimits();
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
        'Could not register this clip with the server. It may have expired. Try recording again.',
      );
    }
  }

  const poster = await readPoster(local.posterUri, limits.maxPosterBytes);
  const urls = await apiClient.requestProofClipUpload({
    clipId: input.clipId,
    videoByteSize: local.byteSize,
    posterByteSize: poster?.size,
    audience: input.audience,
    postToGroup: input.postToGroup === true,
  });

  await putVideoFromDisk(local.fileUri, urls.video.url, urls.video.headers);

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
export async function queueAnyoneProofClipUpload(
  clipId: string,
  limits?: MeOutput['proofClipLimits'],
): Promise<boolean> {
  await markLocalProofClipPendingUpload(clipId, {
    audience: 'anyone',
    postToGroup: false,
  });
  try {
    await uploadProofClip({
      clipId,
      audience: 'anyone',
      postToGroup: false,
      limits,
    });
    await markLocalProofClipPendingUpload(clipId, null);
    return true;
  } catch {
    return false;
  }
}

/**
 * Streams the clip from disk. Reading it into a Blob for `fetch` copies the
 * whole file into memory twice, which aborts the app on low-RAM iPhones.
 * Foreground session so a dead connection rejects and the pending retry runs.
 */
async function putVideoFromDisk(
  fileUri: string,
  uploadUrl: string,
  headers: Record<string, string>,
): Promise<void> {
  const result = await uploadAsync(uploadUrl, fileUri, {
    httpMethod: 'PUT',
    headers,
    uploadType: FileSystemUploadType.BINARY_CONTENT,
    sessionType: FileSystemSessionType.FOREGROUND,
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error('Could not upload the clip. Try again.');
  }
}

/** The poster is optional: a missing or oversized one never blocks the clip. */
async function readPoster(posterUri: string | null, maxBytes: number): Promise<Blob | null> {
  if (!posterUri) {
    return null;
  }
  try {
    const response = await fetch(posterUri);
    const blob = await response.blob();
    if (blob.size === 0 || blob.size > maxBytes) {
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
