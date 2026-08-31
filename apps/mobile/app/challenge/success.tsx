import { Redirect, useLocalSearchParams } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { ChallengeSuccessScreen } from '@/components/challenges';
import { useSession } from '@/lib/auth-client';

function parseCount(value: string | undefined): number {
  if (!value) {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export default function ChallengeSuccessRoute() {
  const { data: session, isPending } = useSession();
  const { title, points, streak, penalty } = useLocalSearchParams<{
    title?: string;
    points?: string;
    streak?: string;
    penalty?: string;
  }>();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <ChallengeSuccessScreen
      currentStreakDays={parseCount(streak)}
      penaltyApplied={parseCount(penalty)}
      pointsAwarded={parseCount(points)}
      title={title || 'Challenge'}
    />
  );
}
