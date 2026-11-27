import type { MatchMetric } from '@product/client';
import { isPoseMetric } from '@product/contract/match-board';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { ChallengeSuccessScreen } from '@/components/challenges';
import { MATCH_DEFAULT_METRIC } from '@/components/matches/match-metric';
import type { FriendChallengeSource } from '@/components/challenges/types/friend-challenge';
import { useSession } from '@/lib/auth-client';

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function parseCount(value: string | string[] | undefined): number {
  const raw = firstParam(value);
  if (!raw) {
    return 0;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function parseId(value: string | string[] | undefined): string | undefined {
  const raw = firstParam(value);
  if (!raw || raw.includes('/') || raw.includes('?')) {
    return undefined;
  }

  return raw;
}

function successFace(
  value: string | undefined,
): 'reps' | 'minutes' | 'glasses' | 'gym' | 'logged' | 'done' | undefined {
  if (
    value === 'reps' ||
    value === 'minutes' ||
    value === 'glasses' ||
    value === 'gym' ||
    value === 'logged' ||
    value === 'done'
  ) {
    return value;
  }

  return undefined;
}

/**
 * What the Well done screen scores the set as. Pose metrics keep their own
 * identity; `other` stays off the push-up friend path.
 */
function resolveMatchMetric(
  metric: string | undefined,
  activityKey: string | undefined,
): MatchMetric {
  const raw = metric ?? activityKey;
  if (raw === 'walk') {
    return 'walk';
  }

  if (raw && isPoseMetric(raw)) {
    return raw;
  }

  if (raw === 'other') {
    return 'walk';
  }

  return MATCH_DEFAULT_METRIC;
}

function friendSourceFor(metric: string | undefined, count: number): FriendChallengeSource {
  if (metric === 'walk') {
    return { kind: 'walk' };
  }

  if (metric === 'other' || count <= 0) {
    return { kind: 'day' };
  }

  const poseMetric = metric && isPoseMetric(metric) ? metric : MATCH_DEFAULT_METRIC;
  return { kind: 'reps', count, metric: poseMetric };
}

export default function ChallengeSuccessRoute() {
  const { data: session, isPending } = useSession();
  const params = useLocalSearchParams<{
    title?: string | string[];
    points?: string | string[];
    streak?: string | string[];
    penalty?: string | string[];
    count?: string | string[];
    target?: string | string[];
    matchId?: string | string[];
    userChallengeId?: string | string[];
    challengeId?: string | string[];
    activityKey?: string | string[];
    metric?: string | string[];
    practice?: string | string[];
    day?: string | string[];
    face?: string | string[];
    minutes?: string | string[];
    glasses?: string | string[];
    proofClipId?: string | string[];
    proofFailed?: string | string[];
    syncing?: string | string[];
  }>();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  const metric = firstParam(params.metric);
  const activityKeyParam = firstParam(params.activityKey);
  const count = firstParam(params.count);
  const matchMetric = resolveMatchMetric(metric, activityKeyParam);
  const activityKey =
    activityKeyParam ?? (metric && isPoseMetric(metric) ? metric : undefined);
  const completedCount = count !== undefined ? parseCount(count) : undefined;

  return (
    <ChallengeSuccessScreen
      completedCount={completedCount}
      friendSource={friendSourceFor(metric ?? activityKey, completedCount ?? 0)}
      isDayFinished={firstParam(params.day) === '1'}
      currentStreakDays={parseCount(params.streak)}
      penaltyApplied={parseCount(params.penalty)}
      pointsAwarded={parseCount(params.points)}
      practice={firstParam(params.practice) === '1'}
      targetCount={firstParam(params.target) ? parseCount(params.target) : undefined}
      title={firstParam(params.title) || 'Challenge'}
      matchId={parseId(params.matchId)}
      userChallengeId={parseId(params.userChallengeId)}
      challengeId={parseId(params.challengeId)}
      activityKey={activityKey}
      matchMetric={matchMetric}
      face={successFace(firstParam(params.face))}
      minutes={firstParam(params.minutes) ? parseCount(params.minutes) : undefined}
      glasses={firstParam(params.glasses) ? parseCount(params.glasses) : undefined}
      proofClipId={parseId(params.proofClipId)}
      proofFailed={firstParam(params.proofFailed) === '1'}
      syncing={firstParam(params.syncing) === '1'}
    />
  );
}
