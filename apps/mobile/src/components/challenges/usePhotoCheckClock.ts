import type { SurpriseEvidenceRequest } from '@product/client';
import { useEffect, useState } from 'react';
import { photoCheckClock } from './photo-check';
import type { PhotoCheckClock } from './types/photo-check';

const TICK_MS = 1_000;

/** The photo check's window, counted down once a second from the server's deadline. */
export function usePhotoCheckClock(request: SurpriseEvidenceRequest): PhotoCheckClock {
  const [clock, setClock] = useState(() => photoCheckClock(request));

  useEffect(() => {
    setClock(photoCheckClock(request));
    const interval = setInterval(() => setClock(photoCheckClock(request)), TICK_MS);
    return () => clearInterval(interval);
  }, [request]);

  return clock;
}
