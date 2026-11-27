import { useRef, useState, type RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import {
  openShareDestination,
  type ShareDestinationId,
  type SharePayload,
} from '@/components/matches/share-destination';
import { SHARE_CAPTURE_OPTIONS } from '@/lib/share-export';
import type { ShareDestinationSelectId } from './ShareDestinationRow';

type UseShareDestinationsOptions = {
  /**
   * Caption, invite, and artifact. When the artifact is `image` without a
   * `posterUri`, the live shot ref is captured first.
   */
  buildPayload: () => SharePayload | Omit<SharePayload, 'artifact'> & {
      artifact: Exclude<SharePayload['artifact'], { kind: 'image' }> | {
        kind: 'image';
        posterUri?: string | null;
      };
    };
  /**
   * Which view to snapshot for an image artifact. Defaults to `shotRef`.
   * Set shares use this to pick the photo page or the poster page.
   */
  getShotRef?: () => RefObject<View | null>;
  onChallenge?: () => void;
  /** Called after Copy link so the host can show a status line. */
  onCopied?: () => void;
};

/**
 * Captures an optional poster from `shotRef`, then opens a named destination.
 * Challenge is delegated to the caller; it never waits on an upload.
 */
export function useShareDestinations(options: UseShareDestinationsOptions) {
  const shotRef = useRef<View>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function capturePosterUri(): Promise<string | null> {
    const ref = options.getShotRef?.() ?? shotRef;
    if (!ref.current) {
      return null;
    }
    try {
      return await captureRef(ref, SHARE_CAPTURE_OPTIONS);
    } catch {
      return null;
    }
  }

  async function preparePayload(): Promise<SharePayload | null> {
    setIsBusy(true);
    try {
      const base = options.buildPayload();
      const artifact = await resolveArtifact(base.artifact, capturePosterUri);
      if (!artifact) {
        return null;
      }
      return {
        caption: base.caption,
        inviteUrl: base.inviteUrl,
        artifact,
      };
    } finally {
      setIsBusy(false);
    }
  }

  async function select(id: ShareDestinationSelectId) {
    if (id === 'challenge') {
      options.onChallenge?.();
      return;
    }

    const payload = await preparePayload();
    if (!payload) {
      return;
    }
    await openShareDestination(id as ShareDestinationId, payload);
    if (id === 'copy') {
      options.onCopied?.();
    }
  }

  return {
    shotRef,
    isBusy,
    preparePayload,
    select: (id: ShareDestinationSelectId) => void select(id),
  };
}

async function resolveArtifact(
  artifact: ReturnType<UseShareDestinationsOptions['buildPayload']>['artifact'],
  capturePosterUri: () => Promise<string | null>,
): Promise<SharePayload['artifact'] | null> {
  if (artifact.kind === 'link') {
    return { kind: 'link' };
  }
  if (artifact.kind === 'video') {
    if (!artifact.clipUri) {
      return null;
    }
    return {
      kind: 'video',
      clipUri: artifact.clipUri,
      socialClipUri: artifact.socialClipUri,
    };
  }

  const existing = artifact.posterUri?.trim() || null;
  const posterUri = existing ?? (await capturePosterUri());
  if (!posterUri) {
    return null;
  }
  return { kind: 'image', posterUri };
}
