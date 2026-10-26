/** The server refuses a second group post on the same day with CONFLICT. */
export function isGroupPostCapError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }
  return error.code === 'CONFLICT';
}
