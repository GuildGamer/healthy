import { createORPCClient } from '@orpc/client';
import type { ContractRouterClient } from '@orpc/contract';
import type { JsonifiedClient } from '@orpc/openapi-client';
import { OpenAPILink } from '@orpc/openapi-client/fetch';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';
import { appContract, type AppContract } from '@product/contract';

export type ApiClient = JsonifiedClient<ContractRouterClient<AppContract>>;

export type CreateApiClientOptions = {
  baseUrl: string;
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>);
  fetch?: typeof fetch;
};

export function createApiClient(options: CreateApiClientOptions): ApiClient {
  const link = new OpenAPILink(appContract, {
    url: options.baseUrl.replace(/\/$/, ''),
    headers: options.headers,
    fetch: options.fetch,
  });

  return createORPCClient(link);
}

export function createApiQueryUtils(client: ApiClient) {
  return createTanstackQueryUtils(client);
}

export {
  activityMeetsTarget,
  isDeviceCapture,
  selfReportCapture,
} from '@product/contract';
export { appContract, createTanstackQueryUtils };
export type {
  ActivityItem,
  AddChallengeReminderInput,
  AppContract,
  CatalogChallenge,
  ChallengeReminder,
  ChallengeRemindersOutput,
  ChallengeCatalogOutput,
  ChallengeCapture,
  ChallengeCaptureKind,
  ChallengeCarbs,
  ChallengeCompletionKind,
  ChallengeDraft,
  ChallengeFieldProgress,
  ChallengeFrequency,
  ChallengeEvidence,
  ChallengeGlucose,
  ChallengeTarget,
  DeviceActivity,
  DeviceMetric,
  HealthLinkStatus,
  ChallengePeakFlow,
  ChallengeVitals,
  ChallengeWater,
  GlucoseContext,
  SaveChallengeDraftInput,
  WaterUnit,
  CompleteChallengeInput,
  CompleteChallengeOutput,
  SkipChallengeEvidenceInput,
  SurpriseEvidenceRequest,
  HealthCategory,
  HealthOutput,
  InboxNotification,
  SetChallengeEnrollmentInput,
  ChallengeHistoryEntry,
  ChallengeHistoryLog,
  ListActivityOutput,
  ListChallengeHistoryInput,
  ListChallengeHistoryOutput,
  ListNotificationsOutput,
  ListTodayChallengesOutput,
  MeOutput,
  NotificationKind,
  RegisterPushDeviceInput,
  RemoveChallengeReminderInput,
  StartChallengeInput,
  StartChallengeOutput,
  TodayChallenge,
  LeaderboardEntry,
  LeaderboardPeriod,
  ListLeaderboardInput,
  ListLeaderboardOutput,
  UpdateCategoriesInput,
  UpdateDisplayNameInput,
  UpdateNotificationSettingsInput,
  UpdateReminderInput,
  UpdateTimeZoneInput,
  UserChallengeStatus,
  WaitlistInput,
  WaitlistOutput,
} from '@product/contract';
