import { Redirect, useLocalSearchParams } from 'expo-router';
import { MatchJoinScreen } from '@/components/matches/MatchJoinScreen';

export default function MatchInviteRoute() {
  const { token } = useLocalSearchParams<{ token: string }>();

  if (!token) {
    return <Redirect href="/(tabs)/challenges" />;
  }

  return <MatchJoinScreen token={token} />;
}
