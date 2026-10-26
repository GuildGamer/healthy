import { apiClient } from '@/lib/api';
import { getLocalProofClip, removeLocalProofClip } from '@/lib/proof-clip-store';

/**
 * Uploads a local clip to object storage and marks it ready. Idempotent:
 * repeating complete is a no-op on the server.
 */
export async function uploadProofClip(input: {
  clipId: string;
  visibility: 'group' | 'shared';
}): Promise<void> {
  const local = await getLocalProofClip(input.clipId);
  if (!local) {
    throw new Error('This clip is no longer on this phone.');
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
