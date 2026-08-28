import { Redirect } from 'expo-router';
import { SplashScreen } from '@/components/auth';
import { ProfileScreen } from '@/components/profile';
import { useSession } from '@/lib/auth-client';

export default function ProfileTab() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <SplashScreen />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <ProfileScreen />;
}
