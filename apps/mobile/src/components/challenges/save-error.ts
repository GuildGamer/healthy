import { SAVE_FAILED_MESSAGE, SAVE_OFFLINE_MESSAGE } from './constants/doing-copy';

/** fetch rejects with a TypeError when the request never reached the server. */
export function isOfflineError(error: unknown): boolean {
  return error instanceof TypeError;
}

/** What a sheet says when a save fails; the numbers always stay put. */
export function saveFailedMessage(error: unknown): string {
  return isOfflineError(error) ? SAVE_OFFLINE_MESSAGE : SAVE_FAILED_MESSAGE;
}
