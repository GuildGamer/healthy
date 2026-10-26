import { Redirect } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { ProofClipsScreen } from '@/components/challenges/ProofClipsScreen';
import { useSession } from '@/lib/auth-client';

export default function ProofClipsRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <ProofClipsScreen />;
}
