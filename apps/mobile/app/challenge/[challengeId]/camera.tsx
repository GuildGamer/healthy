import { Redirect, useLocalSearchParams } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { CaptureCameraScreen } from '@/components/challenges/CaptureCameraScreen';
import { useSession } from '@/lib/auth-client';
import { parseCameraIntent } from '@/lib/capture-session';

export default function CaptureCameraRoute() {
  const { data: session, isPending } = useSession();
  const { challengeId, intent } = useLocalSearchParams<{
    challengeId: string;
    intent?: string;
  }>();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!challengeId) {
    return <Redirect href="/(tabs)/challenges" />;
  }

  return (
    <CaptureCameraScreen
      challengeId={challengeId}
      intent={parseCameraIntent(intent)}
    />
  );
}
