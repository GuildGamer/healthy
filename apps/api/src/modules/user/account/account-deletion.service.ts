import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type PrismaClient } from '@product/db';
import { type AuthenticatedUser, requireUser } from '../../../shared/types/authenticated-user.js';
import type { Result } from '../../../shared/types/result.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { FORMER_MEMBER_NAME, tombstoneEmailFor } from './constants/account-deletion.js';
import type { AccountDeletionError } from './errors/account-deletion.error.js';
import { renewingSubscriptionRefusal } from './renewing-subscription.js';
import type { DeletedAccount, DeletionTransaction } from './types/account-deletion.js';

/** Several thousand rows for a long-standing member; well past the 5 s default. */
const DELETION_TRANSACTION_TIMEOUT_MS = 30_000;

/**
 * Deletes a member's account in one transaction. The user row stays as an
 * anonymous tombstone: finished group standings are recomputed from attempts,
 * completions and walks, and the points ledger is summed per user, so those
 * score facts are kept under a name that identifies nobody. Everything else
 * that described the person goes. Safe to call again: every step is a no-op
 * once done, and a deleted account short-circuits.
 */
@Injectable()
export class AccountDeletionService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async deleteAccount(
    currentUser: AuthenticatedUser | null | undefined,
  ): Promise<Result<DeletedAccount, AccountDeletionError>> {
    const user = requireUser(currentUser);
    const now = new Date();

    return this.prisma.$transaction(
      async (transaction) => {
        if (await this.isAlreadyDeleted(transaction, user.id)) {
          return { success: true, data: { deleted: true } };
        }

        const refusal = await this.refusalFor(transaction, user.id, now);
        if (refusal) {
          return { success: false, error: refusal };
        }

        await this.eraseIdentity(transaction, user.id, now);
        await this.erasePersonalData(transaction, user.id);
        await this.leaveGroups(transaction, user.id, now);
        await this.detachRecords(transaction, user.id);
        return { success: true, data: { deleted: true } };
      },
      { timeout: DELETION_TRANSACTION_TIMEOUT_MS },
    );
  }

  private async isAlreadyDeleted(
    transaction: DeletionTransaction,
    userId: string,
  ): Promise<boolean> {
    const profile = await transaction.userProfile.findUnique({
      where: { userId },
      select: { deletedAt: true },
    });
    return profile?.deletedAt != null;
  }

  private async refusalFor(
    transaction: DeletionTransaction,
    userId: string,
    now: Date,
  ): Promise<AccountDeletionError | null> {
    const subscriptions = await transaction.subscription.findMany({
      where: { userId },
      select: { provider: true, status: true, autoRenewing: true, currentPeriodEndsAt: true },
    });
    return renewingSubscriptionRefusal(subscriptions, now);
  }

  /**
   * Sessions and sign-in methods go, so every phone is signed out and nobody
   * can sign in to the tombstone. Moving off the real email lets it sign up again.
   */
  private async eraseIdentity(
    transaction: DeletionTransaction,
    userId: string,
    now: Date,
  ): Promise<void> {
    const { email } = await transaction.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true },
    });

    await transaction.session.deleteMany({ where: { userId } });
    await transaction.account.deleteMany({ where: { userId } });
    await transaction.verification.deleteMany({ where: { identifier: { contains: email } } });
    await transaction.waitlistEntry.deleteMany({ where: { email } });
    await transaction.user.update({
      where: { id: userId },
      data: {
        name: FORMER_MEMBER_NAME,
        email: tombstoneEmailFor(userId),
        emailVerified: false,
        image: null,
      },
    });
    await transaction.userProfile.upsert({
      where: { userId },
      create: { userId, ...this.tombstoneProfile(now) },
      update: this.tombstoneProfile(now),
    });
  }

  /**
   * Points balance, streak and time zone stay: they are not identifying, and
   * a hosted contest still counts its days in the host's zone.
   */
  private tombstoneProfile(now: Date) {
    return {
      displayName: FORMER_MEMBER_NAME,
      countryCode: null,
      healthCategories: [],
      healthLinkStatus: 'unknown' as const,
      reminderEnabled: false,
      evidenceRemindersEnabled: false,
      promotionalMessagesEnabled: false,
      inProgressNudgeEnabled: false,
      showOnLeaderboard: false,
      groupNotificationsEnabled: false,
      membershipActive: false,
      deactivatedAt: now,
      deletedAt: now,
    };
  }

  /** Readings, logs, drafts, devices, reminders and the inbox. */
  private async erasePersonalData(transaction: DeletionTransaction, userId: string): Promise<void> {
    const ownOccurrence = { userChallenge: { userId } };

    await transaction.vitalReading.deleteMany({ where: ownOccurrence });
    await transaction.challengeLog.deleteMany({ where: ownOccurrence });
    await transaction.surpriseEvidenceRequest.deleteMany({ where: ownOccurrence });
    await transaction.inProgressNudgeDelivery.deleteMany({ where: ownOccurrence });
    await transaction.userChallenge.updateMany({
      where: { userId, draft: { not: Prisma.DbNull } },
      data: { draft: Prisma.DbNull, draftUpdatedAt: null },
    });
    await transaction.deviceActivityLog.updateMany({
      where: { userId, externalId: { not: null } },
      data: { externalId: null },
    });
    await transaction.challengeEnrollment.deleteMany({ where: { userId } });
    await transaction.pushDevice.deleteMany({ where: { userId } });
    await transaction.notification.deleteMany({ where: { userId } });
    await transaction.entitlement.deleteMany({ where: { userId } });
  }

  /**
   * A contest still running loses them the way leaving does. A contest that
   * has ended, settled or not, keeps them as Former member so its board stands.
   */
  private async leaveGroups(
    transaction: DeletionTransaction,
    userId: string,
    now: Date,
  ): Promise<void> {
    const liveMatch = { status: 'open' as const, endsAt: { gt: now } };

    await transaction.matchReaction.deleteMany({
      where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
    });
    await transaction.matchAttempt.deleteMany({ where: { userId, match: liveMatch } });
    await transaction.matchParticipant.deleteMany({ where: { userId, match: liveMatch } });
    await transaction.crew.deleteMany({ where: { ownerUserId: userId } });
    await transaction.crewMember.updateMany({
      where: { userId, leftAt: null },
      data: { leftAt: now },
    });
  }

  /** Analytics keep their counts without saying whose they were. */
  private async detachRecords(transaction: DeletionTransaction, userId: string): Promise<void> {
    await transaction.analyticsEvent.updateMany({ where: { userId }, data: { userId: null } });
  }
}
