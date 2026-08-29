import { Redirect, useLocalSearchParams } from 'expo-router';
import { SplashScreen } from '@/components/auth';
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
  const { title, points, streak } = useLocalSearchParams<{
    title?: string;
    points?: string;
    streak?: string;
  }>();

  if (isPending) {
    return <SplashScreen />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <ChallengeSuccessScreen
      currentStreakDays={parseCount(streak)}
      pointsAwarded={parseCount(points)}
      title={title || 'Challenge'}
    />
  );
}
