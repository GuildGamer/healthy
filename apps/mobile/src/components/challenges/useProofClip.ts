import { useQuery } from '@tanstack/react-query';
import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { getLocalProofClip } from '@/lib/proof-clip-store';
import { isGroupPostCapError } from '@/lib/proof-clip-errors';
import { discardLocalProofClip, uploadProofClip } from '@/lib/proof-clip-upload';
import { POSE_COPY } from './constants/doing-copy';
import { saveProofToPhotos } from './save-proof-to-photos';
import type { ProofClipVisibility } from './types/proof-clip-recording';

function proofClipHref(clipId: string): Href {
  return { pathname: '/proof/[clipId]', params: { clipId } };
}

/**
 * One set's local proof clip and what can be done with it. Upload happens only
 * when the person chooses to publish. A discarded clip is gone on purpose, so
 * it is not reported as missing.
 */
export function useProofClip(
  clipId: string | null,
  visibility: ProofClipVisibility,
  options: { onPublished?: () => void } = {},
) {
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSavedToPhotos, setHasSavedToPhotos] = useState(false);
  const [hasPublished, setHasPublished] = useState(false);
  const [wasDiscarded, setWasDiscarded] = useState(false);
  const localQuery = useQuery({
    queryKey: ['proof-clip-local', clipId],
    queryFn: () => (clipId ? getLocalProofClip(clipId) : Promise.resolve(null)),
    enabled: Boolean(clipId),
  });

  const clip = wasDiscarded ? null : (localQuery.data ?? null);
  const isLoading = Boolean(clipId) && localQuery.isPending;
  const isMissing = Boolean(clipId) && !isLoading && !wasDiscarded && !clip;

  async function publish() {
    if (!clipId) {
      return;
    }

    setIsBusy(true);
    setError(null);
    try {
      await uploadProofClip({ clipId, visibility });
      setHasPublished(true);
      (options.onPublished ?? watch)();
    } catch (publishError) {
      setError(
        isGroupPostCapError(publishError)
          ? POSE_COPY.proofAlreadyPostedToday
          : POSE_COPY.proofPublishFailed,
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function saveToPhotos() {
    if (!clip) {
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
      setHasSavedToPhotos(true);
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
    hasSavedToPhotos,
    hasPublished,
    /** A camera-roll copy carries the code, but the code only checks out once the clip is published. */
    savedHint:
      hasSavedToPhotos && !hasPublished
        ? visibility === 'group'
          ? POSE_COPY.savedNotPosted
          : POSE_COPY.savedNotShared
        : null,
    publishLabel: visibility === 'group' ? POSE_COPY.proofPostToGroup : POSE_COPY.proofShare,
    publish: () => void publish(),
    saveToPhotos: () => void saveToPhotos(),
    confirmDiscard,
    watch,
  };
}

export type ProofClipState = ReturnType<typeof useProofClip>;
