import { Redirect } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { PointsScreen } from '@/components/points';
import { useSession } from '@/lib/auth-client';

export default function PointsRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <PointsScreen />;
}
