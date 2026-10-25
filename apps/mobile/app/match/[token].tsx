import { Redirect, useLocalSearchParams } from 'expo-router';
import { MatchJoinScreen } from '@/components/matches/MatchJoinScreen';

export default function MatchInviteRoute() {
  const { token, join } = useLocalSearchParams<{ token: string; join?: string }>();

  if (!token) {
    return <Redirect href="/(tabs)/challenges" />;
  }

  return <MatchJoinScreen autoJoin={join === 'auto'} token={token} />;
}
