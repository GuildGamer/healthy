import { Redirect } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { EditProfileScreen } from '@/components/profile';
import { useSession } from '@/lib/auth-client';

export default function EditProfileRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <EditProfileScreen />;
}
