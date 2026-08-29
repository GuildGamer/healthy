import { Redirect } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { NotificationsScreen } from '@/components/notifications';
import { useSession } from '@/lib/auth-client';

export default function NotificationsRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <NotificationsScreen />;
}
