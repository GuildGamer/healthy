import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { HomeScreen } from '@/components/home';
import { useSession } from '@/lib/auth-client';
import { TODAY_FOCUS_PARAM } from '@/lib/today-focus';

export default function HomeTab() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const params = useLocalSearchParams<{ [TODAY_FOCUS_PARAM]?: string }>();
  const focusChallengeId = params[TODAY_FOCUS_PARAM];

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  // Cleared once the deck has opened on the card, so a later visit starts where the deck was.
  const focus = focusChallengeId
    ? {
        challengeId: focusChallengeId,
        onHandled: () => router.setParams({ [TODAY_FOCUS_PARAM]: undefined }),
      }
    : null;

  return <HomeScreen focus={focus} />;
}
