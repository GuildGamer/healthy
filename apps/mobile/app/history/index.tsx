import { Redirect } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { HistoryScreen } from '@/components/progress';
import { useSession } from '@/lib/auth-client';

export default function HistoryRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <HistoryScreen />;
}
