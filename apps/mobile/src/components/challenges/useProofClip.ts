import type { ProofClipAudience } from '@product/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Share } from 'react-native';
import * as Sharing from 'expo-sharing';
import { apiClient } from '@/lib/api';
import { getLocalProofClip, markLocalProofClipPendingUpload } from '@/lib/proof-clip-store';
import { isGroupPostCapError } from '@/lib/proof-clip-errors';
import { discardLocalProofClip, uploadProofClip } from '@/lib/proof-clip-upload';
import { POSE_COPY } from './constants/doing-copy';
import { saveProofToPhotos } from './save-proof-to-photos';

function proofClipHref(clipId: string): Href {
  return { pathname: '/proof/[clipId]', params: { clipId } };
}

type UseProofClipOptions = {
  onPublished?: () => void;
  /** When true, the primary solid action posts to the group board. */
  isGroup?: boolean;
};

/**
 * One set's local proof clip and what can be done with it. Upload happens when
 * the person sends, saves (anyone), or posts — never just because the set ended.
 */
export function useProofClip(
  clipId: string | null,
  initialAudience: ProofClipAudience,
  options: UseProofClipOptions = {},
) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isGroup = options.isGroup === true;
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const [audience, setAudienceState] = useState<ProofClipAudience>(initialAudience);
  const [hasUploaded, setHasUploaded] = useState(false);
  const [wasDiscarded, setWasDiscarded] = useState(false);
  const [allowSendWithoutCheck, setAllowSendWithoutCheck] = useState(false);
  const localQuery = useQuery({
    queryKey: ['proof-clip-local', clipId],
    queryFn: () => (clipId ? getLocalProofClip(clipId) : Promise.resolve(null)),
    enabled: Boolean(clipId),
  });

  const clip = wasDiscarded ? null : (localQuery.data ?? null);
  const isLoading = Boolean(clipId) && localQuery.isPending;
  const isMissing = Boolean(clipId) && !isLoading && !wasDiscarded && !clip;

  async function setAudience(next: ProofClipAudience) {
    setAudienceState(next);
    if (!clipId || !hasUploaded) {
      return;
    }
    try {
      await apiClient.setProofClipAudience({ clipId, audience: next });
      void queryClient.invalidateQueries({ queryKey: ['progress'] });
      void queryClient.invalidateQueries({ queryKey: ['challenges', 'history'] });
    } catch {
      setError(POSE_COPY.proofPublishFailed);
    }
  }

  async function uploadIfNeeded(postToGroup: boolean): Promise<boolean> {
    if (!clipId) {
      return false;
    }
    if (audience === 'only_me' && !postToGroup) {
      return true;
    }
    try {
      await uploadProofClip({
        clipId,
        audience,
        postToGroup,
      });
      setHasUploaded(true);
      await markLocalProofClipPendingUpload(clipId, null);
      return true;
    } catch (uploadError) {
      setError(
        isGroupPostCapError(uploadError)
          ? POSE_COPY.proofAlreadyPostedToday
          : POSE_COPY.proofPublishFailed,
      );
      if (audience === 'anyone' && !postToGroup) {
        setAllowSendWithoutCheck(true);
      }
      return false;
    }
  }

  async function openShareSheet() {
    if (!clip) {
      return;
    }
    if (!(await Sharing.isAvailableAsync())) {
      await Share.share({ url: clip.fileUri });
      return;
    }
    await Sharing.shareAsync(clip.fileUri, {
      mimeType: 'video/mp4',
      UTI: 'public.mpeg-4',
    });
  }

  async function send() {
    if (!clipId || !clip) {
      return;
    }

    setIsBusy(true);
    setError(null);
    try {
      if (audience === 'anyone') {
        const uploaded = await uploadIfNeeded(false);
        if (!uploaded) {
          return;
        }
      }
      await openShareSheet();
      setStatusLine(audience === 'anyone' ? POSE_COPY.sentAnyone : POSE_COPY.sentOnlyMe);
      (options.onPublished ?? (() => undefined))();
    } catch {
      setError(POSE_COPY.proofSendFailed);
    } finally {
      setIsBusy(false);
    }
  }

  async function sendWithoutCheck() {
    if (!clip) {
      return;
    }
    setIsBusy(true);
    setError(null);
    try {
      await openShareSheet();
      setStatusLine(POSE_COPY.sentOnlyMe);
      setAllowSendWithoutCheck(false);
    } catch {
      setError(POSE_COPY.proofSendFailed);
    } finally {
      setIsBusy(false);
    }
  }

  async function postToGroup() {
    if (!clipId) {
      return;
    }
    setIsBusy(true);
    setError(null);
    try {
      const uploaded = await uploadIfNeeded(true);
      if (!uploaded) {
        return;
      }
      setStatusLine(POSE_COPY.postedToGroup);
      (options.onPublished ?? (() => undefined))();
    } finally {
      setIsBusy(false);
    }
  }

  async function saveToPhotos() {
    if (!clip || !clipId) {
      return;
    }

    setIsBusy(true);
    setError(null);
    try {
      const failure = await saveProofToPhotos(clip.fileUri);
      if (failure) {
        setError(failure);
        return;
      }
      setStatusLine(audience === 'anyone' ? POSE_COPY.savedAnyone : POSE_COPY.savedOnlyMe);
      if (audience === 'anyone') {
        await markLocalProofClipPendingUpload(clipId, {
          audience: 'anyone',
          postToGroup: false,
        });
        void uploadIfNeeded(false).then((ok) => {
          if (ok) {
            setStatusLine(POSE_COPY.savedAnyone);
          }
        });
      }
    } finally {
      setIsBusy(false);
    }
  }

  async function discard() {
    if (!clipId) {
      return;
    }

    setIsBusy(true);
    try {
      await discardLocalProofClip(clipId);
      setWasDiscarded(true);
    } finally {
      setIsBusy(false);
    }
  }

  function confirmDiscard() {
    Alert.alert(POSE_COPY.proofDiscardTitle, POSE_COPY.proofDiscardBody, [
      { text: POSE_COPY.proofDiscardCancel, style: 'cancel' },
      {
        text: POSE_COPY.proofDiscardConfirm,
        style: 'destructive',
        onPress: () => void discard(),
      },
    ]);
  }

  function watch() {
    if (!clipId) {
      return;
    }
    router.push(proofClipHref(clipId));
  }

  return {
    clip,
    isLoading,
    isMissing,
    isBusy,
    error,
    statusLine,
    audience,
    setAudience,
    hasUploaded,
    allowSendWithoutCheck,
    isGroup,
    primaryLabel: isGroup ? POSE_COPY.proofPostToGroup : POSE_COPY.proofSend,
    busyLabel: POSE_COPY.proofGettingCodeReady,
    primary: () => void (isGroup ? postToGroup() : send()),
    send: () => void send(),
    sendWithoutCheck: () => void sendWithoutCheck(),
    postToGroup: () => void postToGroup(),
    saveToPhotos: () => void saveToPhotos(),
    confirmDiscard,
    watch,
  };
}

export type ProofClipState = ReturnType<typeof useProofClip>;
