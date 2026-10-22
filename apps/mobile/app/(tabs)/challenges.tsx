import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenLoader } from '@/components/feedback';
import { ChallengesHeader, ChallengesScreen } from '@/components/challenges';
import { MatchesListScreen } from '@/components/matches';
import { useSession } from '@/lib/auth-client';
import { type Theme, useThemedStyles } from '@/theme';

type ChallengesSegment = 'mine' | 'groups';

const SEGMENTS = [
  { id: 'mine', label: 'Mine' },
  { id: 'groups', label: 'Groups' },
] as const satisfies readonly { id: ChallengesSegment; label: string }[];

export default function ChallengesTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const { data: session, isPending } = useSession();
  const [segment, setSegment] = useState<ChallengesSegment>('mine');

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <ChallengesHeader
        onAdd={
          segment === 'mine'
            ? () => router.push('/manage-challenges')
            : () => router.push('/matches/create')
        }
        onSelectSegment={setSegment}
        segment={segment}
        segments={SEGMENTS}
      />
      {segment === 'mine' ? <ChallengesScreen /> : <MatchesListScreen />}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
  });
