import { Redirect, useLocalSearchParams } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { ChallengeSuccessScreen } from '@/components/challenges';
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
function friendSourceFor(metric: string | undefined, count: number): FriendChallengeSource {
  if (metric === 'walk') {
    return { kind: 'walk' };
  }

  if (metric === 'other' || count <= 0) {
    return { kind: 'day' };
  }

  return { kind: 'reps', count };
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
  }>();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  const metric = firstParam(params.metric);
  const count = firstParam(params.count);
  /**
   * Missing metric keeps the live pose path on push-ups. `other` (vitals,
   * photo, check-in) must not enter the friend flywheel, so it maps away
   * from push-ups. Personal kickers ignore this when there is no matchId.
   */
  const matchMetric = metric === 'walk' || metric === 'other' ? 'walk' : 'pushups';
  const completedCount = count ? parseCount(count) : undefined;

  return (
    <ChallengeSuccessScreen
      completedCount={completedCount}
      friendSource={friendSourceFor(metric, completedCount ?? 0)}
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
      activityKey={firstParam(params.activityKey)}
      matchMetric={matchMetric}
      face={successFace(firstParam(params.face))}
      minutes={firstParam(params.minutes) ? parseCount(params.minutes) : undefined}
      glasses={firstParam(params.glasses) ? parseCount(params.glasses) : undefined}
    />
  );
}
