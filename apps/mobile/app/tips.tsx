import { Redirect } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { TipsScreen } from '@/components/tips';
import { useSession } from '@/lib/auth-client';

export default function TipsRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <TipsScreen />;
}
