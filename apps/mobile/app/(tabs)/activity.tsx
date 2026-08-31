import { Redirect } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { ActivityScreen } from '@/components/activity';
import { useSession } from '@/lib/auth-client';

export default function ActivityTab() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <ActivityScreen />;
}
