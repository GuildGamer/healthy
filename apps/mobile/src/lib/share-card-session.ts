/** In-memory handoff from a gym selfie submit → success share preview. */

export type ShareCardPayload = {
  photoUri?: string;
  title: string;
  pointsAwarded: number;
  currentStreakDays: number;
};

let pending: ShareCardPayload | null = null;

export function setPendingShareCard(payload: ShareCardPayload): void {
  pending = payload;
}

export function peekPendingShareCard(): ShareCardPayload | null {
  return pending;
}

export function clearPendingShareCard(): void {
  pending = null;
}
