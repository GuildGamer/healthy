import { Inject, Injectable } from '@nestjs/common';
import { ORPCError } from '@orpc/server';
import type { StartCameraCountingInput, StartCameraCountingOutput } from '@product/contract';
import type { PrismaClient } from '@product/db';
import {
  canStartCameraCounting,
  freeCameraStartsRemaining,
} from '../../../shared/membership/entitlements.js';
import { resolveMembershipActive } from '../../../shared/membership/resolve-membership-active.js';
import { type AuthenticatedUser, requireUser } from '../../../shared/types/authenticated-user.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';

@Injectable()
export class CameraCountingService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async start(
    currentUser: AuthenticatedUser | null | undefined,
    input: StartCameraCountingInput,
  ): Promise<StartCameraCountingOutput> {
    const user = requireUser(currentUser);
    const membershipActive = await resolveMembershipActive(
      this.prisma,
      user.id,
      user.email,
    );

    if (membershipActive) {
      return { freeCameraStartsRemaining: null };
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.cameraCountingStart.findUnique({
        where: {
          userId_clientStartId: {
            userId: user.id,
            clientStartId: input.clientStartId,
          },
        },
        select: { id: true },
      });

      if (existing) {
        const startsUsed = await tx.cameraCountingStart.count({
          where: { userId: user.id },
        });
        return {
          freeCameraStartsRemaining: freeCameraStartsRemaining(false, startsUsed),
        };
      }

      const startsUsed = await tx.cameraCountingStart.count({
        where: { userId: user.id },
      });

      if (!canStartCameraCounting(false, startsUsed)) {
        throw new ORPCError('FORBIDDEN', {
          message: 'Membership is required',
          data: { reason: 'membership_required' },
        });
      }

      await tx.cameraCountingStart.create({
        data: {
          userId: user.id,
          clientStartId: input.clientStartId,
          context: input.context,
          userChallengeId: input.context === 'challenge' ? input.userChallengeId : null,
          challengeId: input.context === 'practice' ? input.challengeId : null,
          matchId: input.context === 'match' ? input.matchId : null,
        },
      });

      return {
        freeCameraStartsRemaining: freeCameraStartsRemaining(false, startsUsed + 1),
      };
    });
  }
}
