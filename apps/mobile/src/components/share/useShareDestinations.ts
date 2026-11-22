import { useRef, useState } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import {
  openShareDestination,
  type ShareDestinationId,
  type SharePayload,
} from '@/components/matches/share-destination';
import type { ShareDestinationSelectId } from './ShareDestinationRow';

type UseShareDestinationsOptions = {
  /** Caption and invite; poster is filled from `shotRef` when present. */
  buildPayload: () => Omit<SharePayload, 'posterUri'> | SharePayload;
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
    if (!shotRef.current) {
      return null;
    }
    try {
      return await captureRef(shotRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
    } catch {
      return null;
    }
  }

  async function select(id: ShareDestinationSelectId) {
    if (id === 'challenge') {
      options.onChallenge?.();
      return;
    }

    setIsBusy(true);
    try {
      const base = options.buildPayload();
      const existingPoster =
        'posterUri' in base ? (base.posterUri ?? null) : null;
      const posterUri = existingPoster ?? (await capturePosterUri());
      await openShareDestination(id as ShareDestinationId, {
        ...base,
        posterUri,
      });
      if (id === 'copy') {
        options.onCopied?.();
      }
    } finally {
      setIsBusy(false);
    }
  }

  return {
    shotRef,
    isBusy,
    select: (id: ShareDestinationSelectId) => void select(id),
  };
}
