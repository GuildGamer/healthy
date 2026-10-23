import { Redirect, useLocalSearchParams } from 'expo-router';
import { ChallengeShareScreen } from '@/components/challenges/ChallengeShareScreen';
import { parseShareFriend } from '@/components/challenges/friend-challenge';
import { parseSharePoster } from '@/components/challenges/share-poster';
import { ScreenLoader } from '@/components/feedback';
import { useSession } from '@/lib/auth-client';
import { pendingSharePhotoFor } from '@/lib/share-card-session';

export default function ChallengeShareRoute() {
  const { data: session, isPending } = useSession();
  const params = useLocalSearchParams<{
    kind?: string;
    label?: string;
    value?: string;
    unit?: string;
    when?: string;
    friend?: string;
    count?: string;
    userChallengeId?: string;
    eligible?: string;
  }>();
  const poster = parseSharePoster(params);

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!poster) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <ChallengeShareScreen
      friend={parseShareFriend(params)}
      photoUri={pendingSharePhotoFor(params.userChallengeId)}
      poster={poster}
    />
  );
}
