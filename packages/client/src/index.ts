import { createORPCClient } from '@orpc/client';
import type { ContractRouterClient } from '@orpc/contract';
import type { JsonifiedClient } from '@orpc/openapi-client';
import { OpenAPILink } from '@orpc/openapi-client/fetch';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';
import {
  adminCanManageAdmins,
  adminContract,
  adminHasPermission,
  appContract,
  type AdminContract,
  type AppContract,
} from '@product/contract';

export type ApiClient = JsonifiedClient<ContractRouterClient<AppContract>>;
export type AdminApiClient = JsonifiedClient<
  ContractRouterClient<AdminContract>
>;

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

export function createAdminApiClient(
  options: CreateApiClientOptions,
): AdminApiClient {
  const link = new OpenAPILink(adminContract, {
    url: options.baseUrl.replace(/\/$/, ''),
    headers: options.headers,
    fetch: options.fetch,
  });

  return createORPCClient(link);
}

export function createAdminApiQueryUtils(client: AdminApiClient) {
  return createTanstackQueryUtils(client);
}

export {
  activityMeetsTarget,
  compareChallengeCatalogOrder,
  compareChallengeSortOrder,
  isDeviceCapture,
  selfReportCapture,
  ISO_COUNTRY_CODES,
  isValidCountryCode,
  normalizeCountryCode,
  MATCH_ATTEMPT_MAX_BY_METRIC,
  MATCH_ATTEMPT_SOURCE_BY_METRIC,
  MATCH_CUMULATIVE_DAILY_CAP,
  MATCH_CUMULATIVE_DAILY_CAP_BY_METRIC,
  MATCH_LENGTH_MAX_DAYS,
  MATCH_LENGTH_MIN_DAYS,
  MATCH_MIN_DAYS_BY_SCORING_MODE,
  MATCH_MODES_BY_METRIC,
  MATCH_PARTICIPANT_CAP,
  MATCH_PRESET_DAYS,
  MATCH_WINDOWS_BY_SCORING_MODE,
  isLengthAllowedForScoringMode,
  isScoringModeAllowedForMetric,
  isWindowAllowedForScoringMode,
  matchContestTitle,
  matchInviteUrl,
  matchLengthDays,
  matchScoreUnit,
  matchWindowLength,
  resolveMatchLength,
} from '@product/contract';
export {
  adminCanManageAdmins,
  adminContract,
  adminHasPermission,
  appContract,
  createTanstackQueryUtils,
};
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
  CountryCode,
  Crew,
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
  UpdateCountryInput,
  UserChallengeStatus,
  WaitlistInput,
  WaitlistOutput,
  CreateMatchInput,
  CreateMatchOutput,
  ListMyMatchesOutput,
  MatchAttemptSource,
  MatchBoard,
  MatchDailyScope,
  MatchDurationDays,
  MatchInviteLink,
  MatchLength,
  MatchListItem,
  MatchMetric,
  MatchPreview,
  MatchScoringMode,
  MatchStanding,
  MatchStatus,
  MatchWindow,
  SubmitMatchAttemptInput,
  AdminChallenge,
  AdminContract,
  AdminMeOutput,
  AdminMemberOutput,
  AdminOperator,
  AdminRoleName,
  AdminTip,
  AdminWaitlistEntry,
  ListPublicTipsOutput,
  PublicTip,
} from '@product/contract';
