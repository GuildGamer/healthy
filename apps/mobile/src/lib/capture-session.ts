import type { CapturedSelfie } from './capture-selfie';

export type CameraIntent = 'selfie' | 'proof';

const pending = new Map<string, CapturedSelfie>();

export function parseCameraIntent(value: string | undefined): CameraIntent {
  return value === 'proof' ? 'proof' : 'selfie';
}

export function defaultFacingFor(intent: CameraIntent): 'front' | 'back' {
  return intent === 'selfie' ? 'front' : 'back';
}

export function setCaptureResult(challengeId: string, photo: CapturedSelfie) {
  pending.set(challengeId, photo);
}

export function consumeCaptureResult(
  challengeId: string,
): CapturedSelfie | null {
  const photo = pending.get(challengeId) ?? null;
  pending.delete(challengeId);
  return photo;
}
