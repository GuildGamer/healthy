import { Redirect } from 'expo-router';
import { SplashScreen } from '@/components/auth';
import { NotificationsScreen } from '@/components/notifications';
import { useSession } from '@/lib/auth-client';

export default function NotificationsRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <SplashScreen />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <NotificationsScreen />;
}
