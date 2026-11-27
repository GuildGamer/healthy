import { Redirect } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { PastGroupsScreen } from '@/components/matches/PastGroupsScreen';
import { useSession } from '@/lib/auth-client';

export default function PastGroupsRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <PastGroupsScreen />;
}
