/** The API refuses a members-only setting with this reason rather than a generic error. */
export function isMembershipRequiredError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const record = error as { data?: { reason?: unknown }; message?: unknown };
  if (record.data?.reason === 'membership_required') {
    return true;
  }

  return (
    typeof record.message === 'string' &&
    record.message.toLowerCase().includes('membership is required')
  );
}
