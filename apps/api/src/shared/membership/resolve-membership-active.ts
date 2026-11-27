import {
  isStagingEnvironment,
  normalizeStagingTesterEmail,
} from './staging-tester-membership.js';
import { effectiveMembershipActive } from './testing-membership.js';

type MembershipLookupClient = {
  userProfile: {
    findUnique: (args: {
      where: { userId: string };
      select:
        | { membershipActive: true }
        | {
            membershipActive: true;
            user: { select: { email: true } };
          };
    }) => Promise<{
      membershipActive: boolean;
      user?: { email: string } | null;
    } | null>;
  };
  stagingTesterGrant?: {
    findFirst: (args: {
      where: { email: string; enabled: true };
      select: { id: true };
    }) => Promise<{ id: string } | null>;
  };
};

/**
 * Stored membership flag, testing grant, store-reviewer allowlist, or an
 * enabled staging tester grant (NODE_ENV=staging only).
 * Pass `email` when the caller already has it to skip the nested user read.
 */
export async function resolveMembershipActive(
  client: MembershipLookupClient,
  userId: string,
  email?: string | null,
): Promise<boolean> {
  let stored: boolean | null | undefined;
  let resolvedEmail: string | null | undefined = email;

  if (email !== undefined) {
    const profile = await client.userProfile.findUnique({
      where: { userId },
      select: { membershipActive: true },
    });
    stored = profile?.membershipActive;
  } else {
    const profile = await client.userProfile.findUnique({
      where: { userId },
      select: {
        membershipActive: true,
        user: { select: { email: true } },
      },
    });
    stored = profile?.membershipActive;
    resolvedEmail = profile?.user?.email;
  }

  if (effectiveMembershipActive(stored, resolvedEmail)) {
    return true;
  }

  return hasEnabledStagingTesterGrant(client, resolvedEmail);
}

export async function hasEnabledStagingTesterGrant(
  client: Pick<MembershipLookupClient, 'stagingTesterGrant'>,
  email: string | null | undefined,
): Promise<boolean> {
  if (!isStagingEnvironment() || !email || !client.stagingTesterGrant) {
    return false;
  }

  const grant = await client.stagingTesterGrant.findFirst({
    where: {
      email: normalizeStagingTesterEmail(email),
      enabled: true,
    },
    select: { id: true },
  });

  return grant !== null;
}
