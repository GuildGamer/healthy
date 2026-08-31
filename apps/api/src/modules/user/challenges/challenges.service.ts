import { Inject, Injectable, Optional } from '@nestjs/common';
import { ORPCError } from '@orpc/server';
import {
  fieldProgress,
  toChallengeCapture,
  toChallengeIcon,
  type DeviceActivity,
} from '@product/contract';
import {
  Prisma,
  type Challenge,
  type ChallengeCompletionKind,
  type ChallengeFrequency,
  type HealthCategory,
  type PrismaClient,
  type SurpriseEvidenceRequest,
  type UserChallenge,
  type UserChallengeStatus,
} from '@product/db';
import {
  type AuthenticatedUser,
  requireUser,
} from '../../../shared/types/authenticated-user.js';
import {
  DEFAULT_TIME_ZONE,
  dayKeyFor,
  previousDayKey,
} from '../../../shared/utils/day-key.js';
import { periodKeyFor } from '../../../shared/utils/period-key.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import {
  createAcceptEvidenceValidator,
  EVIDENCE_VALIDATOR,
  type EvidenceValidator,
} from '../../shared-modules/evidence/index.js';
import type {
  CompleteChallengeDto,
  ListActivityDto,
  ListChallengeHistoryDto,
  ListTodayChallengesDto,
  StartChallengeDto,
  SurpriseEvidenceRequestDto,
  TodayChallengeDto,
} from './dto/index.js';
import {
  requireEvidenceFor,
  type ChallengeEvidenceInput,
} from './evidence.js';
import {
  clampedPenalty,
  requireSurprisePhoto,
  shouldRequestSurpriseEvidence,
  surprisePhotoExpectation,
} from './surprise-evidence.js';
import { SURPRISE_EVIDENCE_ROLL } from './surprise-evidence.tokens.js';
import { parseStoredDraft, requireMatchingDraft } from './draft.js';
import { requireDeviceActivityFor } from './device-activity.js';
import {
  CHALLENGE_HISTORY_LIMIT,
  historyEvidence,
  historyLog,
  historyOutcome,
} from './history.js';
import { requireLogFor, type ChallengeLogPayload } from './logs.js';
import { requireVitalsFor, type ChallengeVitalsInput } from './vitals.js';

type AssignmentRecord = UserChallenge & {
  challenge: Challenge;
  surpriseEvidenceRequest: SurpriseEvidenceRequest | null;
};

/** The period key currently open for each cadence, in the user's own zone. */
type DueWindow = Record<ChallengeFrequency, string>;


@Injectable()
export class ChallengesService {
  private readonly surpriseRoll: () => number;

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(EVIDENCE_VALIDATOR)
    private readonly evidenceValidator: EvidenceValidator = createAcceptEvidenceValidator(),
    @Optional()
    @Inject(SURPRISE_EVIDENCE_ROLL)
    surpriseRoll?: () => number,
  ) {
    this.surpriseRoll = surpriseRoll ?? Math.random;
  }

  /**
   * Everything due right now: today's daily challenges plus any weekly or
   * monthly ones whose period is still open. Occurrences are materialised on
   * read, so a user who does not open the app simply has none created.
   */
  async listToday(
    currentUser: AuthenticatedUser | null | undefined,
  ): Promise<ListTodayChallengesDto> {
    const user = requireUser(currentUser);
    const timeZone = await this.timeZoneFor(user.id);
    const window = this.dueWindow(timeZone);

    await this.settleExpiredEvidence(user.id);
    await this.materialiseDueOccurrences(user.id, window);

    const assignments = await this.prisma.userChallenge.findMany({
      where: this.dueFilter(user.id, window),
      include: { challenge: true, surpriseEvidenceRequest: true },
      orderBy: [{ frequency: 'asc' }, { challenge: { title: 'asc' } }],
    });

    const challenges = assignments.map((assignment) =>
      this.toTodayChallenge(assignment),
    );

    return {
      dayKey: window.daily,
      challenges,
      completedCount: challenges.filter((item) => item.status === 'completed')
        .length,
      totalCount: challenges.length,
    };
  }

  /**
   * Moves a pending occurrence to `in_progress`. Points are only awarded on
   * completion, so this is purely a state transition and is safe to retry.
   */
  async start(
    currentUser: AuthenticatedUser | null | undefined,
    userChallengeId: string,
  ): Promise<StartChallengeDto> {
    const user = requireUser(currentUser);
    const assignment = await this.findOwnedAssignment(user.id, userChallengeId);

    // Scoping the update to `pending` stops a concurrent completion from being
    // rolled back to `in_progress`.
    await this.prisma.userChallenge.updateMany({
      where: { id: assignment.id, status: 'pending' },
      data: { status: 'in_progress', startedAt: new Date() },
    });

    const started = await this.prisma.userChallenge.findUniqueOrThrow({
      where: { id: assignment.id },
      include: { challenge: true, surpriseEvidenceRequest: true },
    });

    return { challenge: this.toTodayChallenge(started) };
  }

  async complete(
    currentUser: AuthenticatedUser | null | undefined,
    userChallengeId: string,
    vitals?: ChallengeVitalsInput,
    evidence?: ChallengeEvidenceInput,
    logFields?: {
      glucose?: Parameters<typeof requireLogFor>[1]['glucose'];
      peakFlow?: Parameters<typeof requireLogFor>[1]['peakFlow'];
      water?: Parameters<typeof requireLogFor>[1]['water'];
      carbs?: Parameters<typeof requireLogFor>[1]['carbs'];
    },
    deviceActivity?: DeviceActivity,
  ): Promise<CompleteChallengeDto> {
    const user = requireUser(currentUser);
    await this.settleExpiredEvidence(user.id);
    const assignment = await this.findOwnedAssignment(user.id, userChallengeId);

    if (assignment.status === 'completed') {
      return this.completionSnapshot(user.id, assignment, {
        pointsAwarded: 0,
        penaltyApplied: 0,
      });
    }

    if (assignment.status === 'awaiting_evidence') {
      return this.finishSurprisePhoto(user, assignment, evidence);
    }

    const reading = requireVitalsFor(assignment.challenge.completionKind, vitals);
    const photo = requireEvidenceFor(
      assignment.challenge.completionKind,
      evidence,
    );
    const log = requireLogFor(
      assignment.challenge.completionKind,
      logFields ?? {},
    );
    const capture = toChallengeCapture(assignment.challenge);
    const activity = requireDeviceActivityFor(capture, deviceActivity);

    if (photo) {
      const verdict = await this.evidenceValidator.validateGymPhoto(photo);
      if (!verdict.accepted) {
        throw new ORPCError('BAD_REQUEST', { message: verdict.reason });
      }
    }

    if (
      shouldRequestSurpriseEvidence({
        completionKind: assignment.challenge.completionKind,
        captureKind: capture.kind,
        chancePercent: assignment.challenge.surpriseEvidenceChancePercent,
        unitSample: this.surpriseRoll(),
      })
    ) {
      return this.openSurpriseRequest(user, assignment, reading);
    }

    return this.rewardCompletion(user, assignment, reading, log, activity);
  }

  /**
   * Writes partial form fields. Starts the occurrence if it was still pending
   * so a finish nudge has a clock. Never awards points.
   */
  async saveDraft(
    currentUser: AuthenticatedUser | null | undefined,
    userChallengeId: string,
    draft: Parameters<typeof requireMatchingDraft>[1],
  ): Promise<StartChallengeDto> {
    const user = requireUser(currentUser);
    const assignment = await this.findOwnedAssignment(user.id, userChallengeId);

    if (assignment.status === 'completed') {
      throw new ORPCError('BAD_REQUEST', {
        message: 'This challenge is already finished',
      });
    }

    requireMatchingDraft(assignment.challenge.completionKind, draft);

    const updated = await this.prisma.userChallenge.update({
      where: { id: assignment.id },
      data: {
        draft,
        draftUpdatedAt: new Date(),
        status:
          assignment.status === 'pending' ? 'in_progress' : assignment.status,
        startedAt: assignment.startedAt ?? new Date(),
      },
      include: { challenge: true, surpriseEvidenceRequest: true },
    });

    return { challenge: this.toTodayChallenge(updated) };
  }

  async skipEvidence(
    currentUser: AuthenticatedUser | null | undefined,
    userChallengeId: string,
  ): Promise<CompleteChallengeDto> {
    const user = requireUser(currentUser);
    await this.settleExpiredEvidence(user.id);
    const assignment = await this.findOwnedAssignment(user.id, userChallengeId);

    if (assignment.status === 'completed') {
      return this.completionSnapshot(user.id, assignment, {
        pointsAwarded: 0,
        penaltyApplied: 0,
      });
    }

    if (assignment.status !== 'awaiting_evidence') {
      throw new ORPCError('BAD_REQUEST', {
        message: 'This challenge is not waiting for a photo',
      });
    }

    return this.penalizeEvidence(assignment, 'skipped');
  }

  private async finishSurprisePhoto(
    user: AuthenticatedUser,
    assignment: AssignmentRecord,
    evidence: ChallengeEvidenceInput | undefined,
  ): Promise<CompleteChallengeDto> {
    const request = assignment.surpriseEvidenceRequest;
    if (!request || request.status !== 'pending') {
      return this.penalizeEvidence(assignment, 'expired');
    }

    if (request.expiresAt.getTime() <= Date.now()) {
      return this.penalizeEvidence(assignment, 'expired');
    }

    const photo = requireSurprisePhoto(evidence);
    const verdict = await this.evidenceValidator.validatePhoto(
      photo,
      surprisePhotoExpectation({
        completionKind: assignment.challenge.completionKind,
        title: assignment.challenge.title,
        instruction: assignment.challenge.instruction,
      }),
    );

    if (!verdict.accepted) {
      throw new ORPCError('BAD_REQUEST', { message: verdict.reason });
    }

    await this.prisma.surpriseEvidenceRequest.update({
      where: { id: request.id },
      data: { status: 'submitted' },
    });

    return this.rewardCompletion(user, assignment, null);
  }

  private async openSurpriseRequest(
    user: AuthenticatedUser,
    assignment: AssignmentRecord,
    reading: ChallengeVitalsInput | null,
  ): Promise<CompleteChallengeDto> {
    const windowSeconds = assignment.challenge.surpriseEvidenceWindowSeconds;
    const penaltyPoints = assignment.challenge.surpriseEvidencePenaltyPoints;
    const expiresAt = new Date(Date.now() + windowSeconds * 1000);
    const idempotencyKey = `challenge_evidence_request:${assignment.id}`;

    const opened = await this.prisma.$transaction(async (tx) => {
      if (reading) {
        await tx.vitalReading.upsert({
          where: { userChallengeId: assignment.id },
          create: {
            userChallengeId: assignment.id,
            systolic: reading.systolic,
            diastolic: reading.diastolic,
            pulse: reading.pulse,
            notes: reading.notes,
          },
          update: {
            systolic: reading.systolic,
            diastolic: reading.diastolic,
            pulse: reading.pulse,
            notes: reading.notes,
            recordedAt: new Date(),
          },
        });
      }

      const request = await tx.surpriseEvidenceRequest.upsert({
        where: { userChallengeId: assignment.id },
        create: {
          userChallengeId: assignment.id,
          windowSeconds,
          penaltyPoints,
          expiresAt,
        },
        update: {},
      });

      const updated = await tx.userChallenge.update({
        where: { id: assignment.id },
        data: {
          status: 'awaiting_evidence',
          startedAt: assignment.startedAt ?? new Date(),
        },
        include: { challenge: true, surpriseEvidenceRequest: true },
      });

      await tx.notification.upsert({
        where: { idempotencyKey },
        create: {
          userId: user.id,
          kind: 'evidence',
          title: 'Photo check',
          body: `Send a photo for ${assignment.challenge.title} in the next ${windowSeconds} seconds.`,
          idempotencyKey,
        },
        update: {},
      });

      return { updated, request };
    });

    return this.completionSnapshot(user.id, opened.updated, {
      pointsAwarded: 0,
      penaltyApplied: 0,
      evidenceRequest: this.toEvidenceRequestDto(
        opened.request,
        'awaiting_evidence',
      ),
    });
  }

  private async rewardCompletion(
    user: AuthenticatedUser,
    assignment: AssignmentRecord,
    reading: ChallengeVitalsInput | null,
    log: ChallengeLogPayload | null = null,
    activity: DeviceActivity | null = null,
  ): Promise<CompleteChallengeDto> {
    const timeZone = await this.timeZoneFor(user.id);
    const todayKey = dayKeyFor(timeZone);
    const idempotencyKey = `challenge_complete:${assignment.id}`;
    const rewardPoints = assignment.challenge.rewardPoints;

    return this.prisma.$transaction(async (tx) => {
      const existingLedger = await tx.pointLedgerEntry.findUnique({
        where: { idempotencyKey },
      });

      if (existingLedger) {
        const profile = await tx.userProfile.findUniqueOrThrow({
          where: { userId: user.id },
        });
        const refreshed = await tx.userChallenge.findUniqueOrThrow({
          where: { id: assignment.id },
          include: { challenge: true, surpriseEvidenceRequest: true },
        });
        return this.toCompleteDto(refreshed, profile, 0, 0);
      }

      const dailyDoneBefore = await tx.userChallenge.count({
        where: {
          userId: user.id,
          frequency: 'daily',
          periodKey: todayKey,
          status: 'completed',
          completionOutcome: { not: 'penalized' },
        },
      });

      const completed = await tx.userChallenge.update({
        where: { id: assignment.id },
        data: {
          status: 'completed',
          completionOutcome: 'rewarded',
          startedAt: assignment.startedAt ?? new Date(),
          completedAt: new Date(),
          draft: Prisma.DbNull,
          draftUpdatedAt: null,
        },
        include: { challenge: true, surpriseEvidenceRequest: true },
      });

      if (log) {
        await tx.challengeLog.upsert({
          where: { userChallengeId: assignment.id },
          create: {
            userChallengeId: assignment.id,
            payload: log,
          },
          update: {
            payload: log,
            recordedAt: new Date(),
          },
        });
      }

      if (activity) {
        await this.persistDeviceActivity(tx, user.id, assignment.id, activity);
      }

      if (reading) {
        await tx.vitalReading.upsert({
          where: { userChallengeId: assignment.id },
          create: {
            userChallengeId: assignment.id,
            systolic: reading.systolic,
            diastolic: reading.diastolic,
            pulse: reading.pulse,
            notes: reading.notes,
          },
          update: {
            systolic: reading.systolic,
            diastolic: reading.diastolic,
            pulse: reading.pulse,
            notes: reading.notes,
            recordedAt: new Date(),
          },
        });
      }

      await tx.pointLedgerEntry.create({
        data: {
          userId: user.id,
          delta: rewardPoints,
          reason: `Completed: ${assignment.challenge.title}`,
          idempotencyKey,
          userChallengeId: assignment.id,
        },
      });

      await tx.notification.upsert({
        where: { idempotencyKey },
        create: {
          userId: user.id,
          kind: 'success',
          title: 'Challenge completed',
          body: `You earned ${rewardPoints} points for ${assignment.challenge.title}.`,
          idempotencyKey,
        },
        update: {},
      });

      const profileBefore = await tx.userProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
      });

      const nextStreak = await this.nextStreakDays(tx, {
        userId: user.id,
        storedStreakDays: profileBefore.currentStreakDays,
        completedFrequency: assignment.frequency,
        isFirstDailyToday: dailyDoneBefore === 0,
        todayKey,
      });

      const profile = await tx.userProfile.update({
        where: { userId: user.id },
        data: {
          pointsBalance: { increment: rewardPoints },
          currentStreakDays: nextStreak,
        },
      });

      return this.toCompleteDto(completed, profile, rewardPoints, 0);
    });
  }

  private async penalizeEvidence(
    assignment: AssignmentRecord,
    resolution: 'skipped' | 'expired',
  ): Promise<CompleteChallengeDto> {
    const request = assignment.surpriseEvidenceRequest;
    const penaltyPoints = request?.penaltyPoints ?? assignment.challenge.surpriseEvidencePenaltyPoints;
    const idempotencyKey = `challenge_evidence_penalty:${assignment.id}`;

    return this.prisma.$transaction(async (tx) => {
      const existingLedger = await tx.pointLedgerEntry.findUnique({
        where: { idempotencyKey },
      });

      if (existingLedger) {
        const profile = await tx.userProfile.findUniqueOrThrow({
          where: { userId: assignment.userId },
        });
        const refreshed = await tx.userChallenge.findUniqueOrThrow({
          where: { id: assignment.id },
          include: { challenge: true, surpriseEvidenceRequest: true },
        });
        return this.toCompleteDto(refreshed, profile, 0, Math.abs(existingLedger.delta));
      }

      if (request) {
        await tx.surpriseEvidenceRequest.update({
          where: { id: request.id },
          data: { status: resolution },
        });
      }

      const completed = await tx.userChallenge.update({
        where: { id: assignment.id },
        data: {
          status: 'completed',
          completionOutcome: 'penalized',
          startedAt: assignment.startedAt ?? new Date(),
          completedAt: new Date(),
        },
        include: { challenge: true, surpriseEvidenceRequest: true },
      });

      const profileBefore = await tx.userProfile.upsert({
        where: { userId: assignment.userId },
        create: { userId: assignment.userId },
        update: {},
      });
      const applied = clampedPenalty(profileBefore.pointsBalance, penaltyPoints);

      await tx.pointLedgerEntry.create({
        data: {
          userId: assignment.userId,
          delta: -applied,
          reason:
            resolution === 'expired'
              ? `Missed photo: ${assignment.challenge.title}`
              : `Skipped photo: ${assignment.challenge.title}`,
          idempotencyKey,
          userChallengeId: assignment.id,
        },
      });

      await tx.notification.upsert({
        where: { idempotencyKey },
        create: {
          userId: assignment.userId,
          kind: 'penalty',
          title: 'Photo check missed',
          body:
            applied > 0
              ? `${applied} points deducted for ${assignment.challenge.title}.`
              : `The photo window closed for ${assignment.challenge.title}.`,
          idempotencyKey,
        },
        update: {},
      });

      const profile = await tx.userProfile.update({
        where: { userId: assignment.userId },
        data: { pointsBalance: { decrement: applied } },
      });

      return this.toCompleteDto(completed, profile, 0, applied);
    });
  }

  private async settleExpiredEvidence(userId: string): Promise<void> {
    const overdue = await this.prisma.userChallenge.findMany({
      where: {
        userId,
        status: 'awaiting_evidence',
        surpriseEvidenceRequest: {
          status: 'pending',
          expiresAt: { lte: new Date() },
        },
      },
      include: { challenge: true, surpriseEvidenceRequest: true },
    });

    for (const assignment of overdue) {
      if (assignment.status !== 'awaiting_evidence') {
        continue;
      }

      await this.penalizeEvidence(assignment, 'expired');
    }
  }

  private async completionSnapshot(
    userId: string,
    assignment: AssignmentRecord,
    extras: {
      pointsAwarded: number;
      penaltyApplied: number;
      evidenceRequest?: SurpriseEvidenceRequestDto | null;
    },
  ): Promise<CompleteChallengeDto> {
    const profile = await this.ensureProfile(userId);
    const challenge = this.toTodayChallenge(assignment);
    return {
      challenge,
      pointsBalance: profile.pointsBalance,
      currentStreakDays: profile.currentStreakDays,
      pointsAwarded: extras.pointsAwarded,
      evidenceRequest: extras.evidenceRequest ?? challenge.evidenceRequest,
      penaltyApplied: extras.penaltyApplied,
    };
  }

  private toCompleteDto(
    assignment: AssignmentRecord,
    profile: { pointsBalance: number; currentStreakDays: number },
    pointsAwarded: number,
    penaltyApplied: number,
  ): CompleteChallengeDto {
    const challenge = this.toTodayChallenge(assignment);
    return {
      challenge,
      pointsBalance: profile.pointsBalance,
      currentStreakDays: profile.currentStreakDays,
      pointsAwarded,
      evidenceRequest: challenge.evidenceRequest,
      penaltyApplied,
    };
  }

  async listActivity(
    currentUser: AuthenticatedUser | null | undefined,
  ): Promise<ListActivityDto> {
    const user = requireUser(currentUser);

    const entries = await this.prisma.pointLedgerEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      items: entries.map((entry) => ({
        id: entry.id,
        delta: entry.delta,
        reason: entry.reason,
        createdAt: entry.createdAt.toISOString(),
      })),
    };
  }

  async listHistory(
    currentUser: AuthenticatedUser | null | undefined,
    challengeId: string,
  ): Promise<ListChallengeHistoryDto> {
    const user = requireUser(currentUser);

    const assignments = await this.prisma.userChallenge.findMany({
      where: {
        userId: user.id,
        challengeId,
        status: 'completed',
      },
      orderBy: [{ completedAt: 'desc' }, { periodKey: 'desc' }],
      take: CHALLENGE_HISTORY_LIMIT,
      include: {
        challenge: { select: { completionKind: true } },
        vitalReading: true,
        challengeLog: true,
        deviceActivityLog: true,
        surpriseEvidenceRequest: true,
        ledgerEntries: { select: { delta: true } },
      },
    });

    return {
      challengeId,
      entries: assignments.map((assignment) => ({
        id: assignment.id,
        periodKey: assignment.periodKey,
        completedAt: (
          assignment.completedAt ?? assignment.updatedAt
        ).toISOString(),
        outcome: historyOutcome(assignment.completionOutcome),
        pointsDelta: assignment.ledgerEntries.reduce(
          (total, entry) => total + entry.delta,
          0,
        ),
        log: historyLog({
          completionKind: assignment.challenge.completionKind,
          vitalReading: assignment.vitalReading,
          challengeLogPayload: assignment.challengeLog?.payload,
          deviceActivity: assignment.deviceActivityLog,
        }),
        evidence: historyEvidence(assignment.surpriseEvidenceRequest?.status),
      })),
    };
  }

  /**
   * Only daily challenges carry the streak. A monthly check-up completed once
   * should not imply a month of consecutive daily effort.
   */
  private async nextStreakDays(
    tx: Pick<PrismaClient, 'userChallenge'>,
    input: {
      userId: string;
      storedStreakDays: number;
      completedFrequency: ChallengeFrequency;
      isFirstDailyToday: boolean;
      todayKey: string;
    },
  ): Promise<number> {
    if (input.completedFrequency !== 'daily' || !input.isFirstDailyToday) {
      return input.storedStreakDays;
    }

    const continuedYesterday = await tx.userChallenge.findFirst({
      where: {
        userId: input.userId,
        frequency: 'daily',
        periodKey: previousDayKey(input.todayKey),
        status: 'completed',
        completionOutcome: { not: 'penalized' },
      },
      select: { id: true },
    });

    return continuedYesterday ? input.storedStreakDays + 1 : 1;
  }


  /** Creates the occurrence rows for any enrolment whose period has opened. */
  private async materialiseDueOccurrences(
    userId: string,
    window: DueWindow,
  ): Promise<void> {
    const enrollments = await this.prisma.challengeEnrollment.findMany({
      where: { userId, isActive: true, challenge: { isActive: true } },
      select: { id: true, challengeId: true, frequency: true },
    });

    if (enrollments.length === 0) {
      return;
    }

    await this.prisma.userChallenge.createMany({
      data: enrollments.map((enrollment) => ({
        userId,
        challengeId: enrollment.challengeId,
        enrollmentId: enrollment.id,
        frequency: enrollment.frequency,
        periodKey: window[enrollment.frequency],
      })),
      // The unique key on (user, challenge, period) makes this the whole
      // idempotency story — re-reading the list never duplicates or resets.
      skipDuplicates: true,
    });
  }

  private dueWindow(timeZone: string): DueWindow {
    return {
      daily: periodKeyFor('daily', timeZone),
      weekly: periodKeyFor('weekly', timeZone),
      monthly: periodKeyFor('monthly', timeZone),
    };
  }

  private dueFilter(userId: string, window: DueWindow) {
    return {
      userId,
      OR: [
        { frequency: 'daily' as const, periodKey: window.daily },
        { frequency: 'weekly' as const, periodKey: window.weekly },
        { frequency: 'monthly' as const, periodKey: window.monthly },
      ],
    };
  }

  private async timeZoneFor(userId: string): Promise<string> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { timeZone: true },
    });

    return profile?.timeZone ?? DEFAULT_TIME_ZONE;
  }

  private async findOwnedAssignment(userId: string, userChallengeId: string) {
    const assignment = await this.prisma.userChallenge.findUnique({
      where: { id: userChallengeId },
      include: { challenge: true, surpriseEvidenceRequest: true },
    });

    if (!assignment || assignment.userId !== userId) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Challenge assignment not found',
      });
    }

    return assignment;
  }

  private async ensureProfile(userId: string) {
    return this.prisma.userProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  private async persistDeviceActivity(
    tx: Prisma.TransactionClient,
    userId: string,
    userChallengeId: string,
    activity: DeviceActivity,
  ): Promise<void> {
    if (activity.externalId) {
      const existing = await tx.deviceActivityLog.findUnique({
        where: {
          userId_externalId: {
            userId,
            externalId: activity.externalId,
          },
        },
        select: { userChallengeId: true },
      });

      if (existing && existing.userChallengeId !== userChallengeId) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'That workout was already used for another challenge',
        });
      }
    }

    const fields = {
      source: activity.source,
      metric: activity.metric,
      durationSeconds: activity.durationSeconds ?? null,
      distanceMeters: activity.distanceMeters ?? null,
      count: activity.count ?? null,
      startedAt: activity.startedAt ? new Date(activity.startedAt) : null,
      endedAt: activity.endedAt ? new Date(activity.endedAt) : null,
      externalId: activity.externalId ?? null,
    };

    await tx.deviceActivityLog.upsert({
      where: { userChallengeId },
      create: {
        userId,
        userChallengeId,
        ...fields,
      },
      update: fields,
    });
  }

  private toTodayChallenge(assignment: {
    id: string;
    challengeId: string;
    periodKey: string;
    frequency: ChallengeFrequency;
    status: UserChallengeStatus;
    draft?: unknown;
    surpriseEvidenceRequest?: SurpriseEvidenceRequest | null;
    challenge: {
      title: string;
      description: string;
      category: HealthCategory;
      rewardPoints: number;
      completionKind: ChallengeCompletionKind;
      instruction: string;
      icon: string;
      captureKind?: string;
      deviceMetric?: string | null;
      targetDurationMinutes?: number | null;
      targetDistanceMeters?: number | null;
      targetCount?: number | null;
    };
  }): TodayChallengeDto {
    const draft = parseStoredDraft(assignment.draft);
    const capture = toChallengeCapture(assignment.challenge);
    return {
      id: assignment.id,
      challengeId: assignment.challengeId,
      title: assignment.challenge.title,
      description: assignment.challenge.description,
      category: assignment.challenge.category,
      rewardPoints: assignment.challenge.rewardPoints,
      status: assignment.status,
      frequency: assignment.frequency,
      completionKind: assignment.challenge.completionKind,
      instruction: assignment.challenge.instruction || assignment.challenge.description,
      icon: toChallengeIcon(assignment.challenge.icon),
      periodKey: assignment.periodKey,
      evidenceRequest: this.toEvidenceRequestDto(
        assignment.surpriseEvidenceRequest,
        assignment.status,
      ),
      draft,
      progress: fieldProgress({
        completionKind: assignment.challenge.completionKind,
        status: assignment.status,
        draft,
      }),
      capture,
    };
  }

  private toEvidenceRequestDto(
    request: SurpriseEvidenceRequest | null | undefined,
    status: UserChallengeStatus,
  ): SurpriseEvidenceRequestDto | null {
    if (status !== 'awaiting_evidence' || !request || request.status !== 'pending') {
      return null;
    }

    if (request.expiresAt.getTime() <= Date.now()) {
      return null;
    }

    return {
      expiresAt: request.expiresAt.toISOString(),
      windowSeconds: request.windowSeconds,
      penaltyPoints: request.penaltyPoints,
    };
  }
}
