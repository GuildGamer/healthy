import { apiClient } from '@/lib/api';
import {
  getLocalProofClip,
  markLocalProofClipServerRecorded,
  removeLocalProofClip,
} from '@/lib/proof-clip-store';

/**
 * Uploads a local clip to object storage and marks it ready. Idempotent:
 * repeating complete is a no-op on the server. Retries `recordProofClip` when
 * the set finished offline or the earlier record call failed.
 */
export async function uploadProofClip(input: {
  clipId: string;
  visibility: 'group' | 'shared';
}): Promise<void> {
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

  const urls = await apiClient.requestProofClipUpload({
    clipId: input.clipId,
    videoByteSize: local.byteSize,
    posterByteSize: undefined,
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

  if (urls.poster && local.posterUri) {
    const posterResponse = await fetch(local.posterUri);
    const posterBlob = await posterResponse.blob();
    const putPoster = await fetch(urls.poster.url, {
      method: 'PUT',
      headers: urls.poster.headers,
      body: posterBlob,
    });
    if (!putPoster.ok) {
      throw new Error('Could not upload the poster. Try again.');
    }
  }

  await apiClient.completeProofClipUpload({
    clipId: input.clipId,
    visibility: input.visibility,
  });
}

export async function discardLocalProofClip(clipId: string): Promise<void> {
  await removeLocalProofClip(clipId);
  try {
    await apiClient.removeProofClip({ clipId });
  } catch {
    // Local discard still wins if the server call fails.
  }
}
