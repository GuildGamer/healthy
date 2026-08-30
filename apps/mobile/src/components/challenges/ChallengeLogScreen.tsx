import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { apiClient } from '@/lib/api';
import { LogReadingScreen } from './LogReadingScreen';
import { LogVitalsScreen } from './LogVitalsScreen';

export function ChallengeLogScreen({ challengeId }: { challengeId: string }) {
  const todayQuery = useQuery({
    queryKey: ['challenges', 'today'],
    queryFn: () => apiClient.listTodayChallenges(),
  });

  const occurrence = todayQuery.data?.challenges.find(
    (item) => item.challengeId === challengeId,
  );

  if (todayQuery.isPending) {
    return <ScreenLoader />;
  }

  if (occurrence?.completionKind === 'vitals_bp') {
    return <LogVitalsScreen challengeId={challengeId} />;
  }

  if (
    occurrence?.completionKind === 'glucose' ||
    occurrence?.completionKind === 'peak_flow' ||
    occurrence?.completionKind === 'water' ||
    occurrence?.completionKind === 'carbs'
  ) {
    return <LogReadingScreen challengeId={challengeId} />;
  }

  if (occurrence?.completionKind === 'check_in') {
    return <Redirect href={`/challenge/${challengeId}/confirm`} />;
  }

  if (occurrence?.completionKind === 'evidence_photo') {
    return <Redirect href={`/challenge/${challengeId}/evidence`} />;
  }

  return <Redirect href="/(tabs)/challenges" />;
}
