import { proofClipLimitsForUpload } from '@/lib/proof-clip-limits-cache';
import { getAppQueryClient } from '@/lib/query-client-holder';
import { listPendingProofClipUploads, markLocalProofClipPendingUpload } from '@/lib/proof-clip-store';
import { uploadProofClip } from '@/lib/proof-clip-upload';

/** Retries Anyone uploads queued after a set or Save, on app open and reconnect. */
export async function flushPendingProofUploads(): Promise<void> {
  const pending = await listPendingProofClipUploads();
  const limits = proofClipLimitsForUpload(getAppQueryClient());
  for (const clip of pending) {
    if (!clip.pendingUpload) {
      continue;
    }
    try {
      await uploadProofClip({
        clipId: clip.clipId,
        audience: clip.pendingUpload.audience,
        postToGroup: clip.pendingUpload.postToGroup,
        limits,
      });
      await markLocalProofClipPendingUpload(clip.clipId, null);
    } catch {
      // Leave the flag so the next open or reconnect tries again.
    }
  }
}
