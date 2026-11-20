/**
 * Testing-phase membership grant. Every account is treated as a member so
 * signups can use paid challenges before checkout exists for them.
 *
 * This does not write a subscription. Set MEMBERSHIP_BYPASS=0 before launch,
 * then delete this file and every call to `effectiveMembershipActive`.
 */

function readFlag(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Unset means the testing grant is still on. `0` turns it off for launch.
 * `0` is a real setting here, not the usual "not configured" placeholder.
 */
export function readTestingMembership(source: NodeJS.ProcessEnv = process.env): boolean {
  const configured = readFlag(source.MEMBERSHIP_BYPASS);

  if (!configured) {
    return true;
  }

  const value = configured.toLowerCase();

  if (value === '1' || value === 'true' || value === 'on') {
    return true;
  }

  if (value === '0' || value === 'false' || value === 'off') {
    return false;
  }

  throw new Error(`MEMBERSHIP_BYPASS must be 0 or 1, got '${configured}'`);
}

export function isTestingMembershipEnabled(): boolean {
  return readTestingMembership();
}

/** Stored membership, or every account while the testing grant is on. */
export function effectiveMembershipActive(stored: boolean | null | undefined): boolean {
  if (isTestingMembershipEnabled()) {
    return true;
  }

  return stored ?? false;
}
