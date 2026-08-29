import { Redirect } from 'expo-router';
import { SplashScreen } from '@/components/auth';
import { EditProfileScreen } from '@/components/profile';
import { useSession } from '@/lib/auth-client';

export default function EditProfileRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <SplashScreen />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <EditProfileScreen />;
}
