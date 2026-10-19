import { Redirect, useLocalSearchParams } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { ChallengeSuccessScreen } from '@/components/challenges';
import { useSession } from '@/lib/auth-client';

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
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
    metric?: string | string[];
    practice?: string | string[];
  }>();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  const metric = firstParam(params.metric);
  const count = firstParam(params.count);

  return (
    <ChallengeSuccessScreen
      completedCount={count ? parseCount(count) : undefined}
      currentStreakDays={parseCount(params.streak)}
      penaltyApplied={parseCount(params.penalty)}
      pointsAwarded={parseCount(params.points)}
      practice={firstParam(params.practice) === '1'}
      targetCount={
        firstParam(params.target) ? parseCount(params.target) : undefined
      }
      title={firstParam(params.title) || 'Challenge'}
      matchId={parseId(params.matchId)}
      userChallengeId={parseId(params.userChallengeId)}
      matchMetric={metric === 'walk' ? 'walk' : 'pushups'}
    />
  );
}
