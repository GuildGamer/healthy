import { Redirect } from 'expo-router';
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '@product/brand';
import { ScreenLoader } from '@/components/feedback';
import { ChallengesScreen } from '@/components/challenges';
import { MatchesListScreen } from '@/components/matches';
import { SegmentedTabs } from '@/components/navigation';
import { useSession } from '@/lib/auth-client';

type ChallengesSegment = 'mine' | 'groups';

const SEGMENTS = [
  { id: 'mine', label: 'Mine' },
  { id: 'groups', label: 'Groups' },
] as const satisfies readonly { id: ChallengesSegment; label: string }[];

export default function ChallengesTab() {
  const { data: session, isPending } = useSession();
  const [segment, setSegment] = useState<ChallengesSegment>('mine');

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={styles.screen}>
      <SegmentedTabs
        onSelect={setSegment}
        options={SEGMENTS}
        selected={segment}
        testID="challenges-segment"
      />
      {segment === 'mine' ? <ChallengesScreen /> : <MatchesListScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 12,
  },
});
