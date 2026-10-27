import { listPendingProofClipUploads, markLocalProofClipPendingUpload } from '@/lib/proof-clip-store';
import { uploadProofClip } from '@/lib/proof-clip-upload';

/** Retries Save-queued uploads on app open and reconnect. */
export async function flushPendingProofUploads(): Promise<void> {
  const pending = await listPendingProofClipUploads();
  for (const clip of pending) {
    if (!clip.pendingUpload) {
      continue;
    }
    try {
      await uploadProofClip({
        clipId: clip.clipId,
        audience: clip.pendingUpload.audience,
        postToGroup: clip.pendingUpload.postToGroup,
      });
      await markLocalProofClipPendingUpload(clip.clipId, null);
    } catch {
      // Leave the flag so the next open or reconnect tries again.
    }
  }
}
