import { Redirect, useLocalSearchParams } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { MatchCreateScreen } from '@/components/matches/MatchCreateScreen';
import { type CreatePrefillParams, createPrefillFrom } from '@/components/matches/group-rerun';
import { useSession } from '@/lib/auth-client';

export default function MatchCreateRoute() {
  const { data: session, isPending } = useSession();
  const params = useLocalSearchParams<CreatePrefillParams>();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <MatchCreateScreen prefill={createPrefillFrom(params)} />;
}
