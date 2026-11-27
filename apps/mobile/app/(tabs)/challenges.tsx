import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenLoader } from '@/components/feedback';
import { ChallengesHeader, ChallengesScreen } from '@/components/challenges';
import { MatchesListScreen } from '@/components/matches';
import { useSession } from '@/lib/auth-client';
import {
  CHALLENGES_SEGMENT_PARAM,
  CHALLENGES_SEGMENTS,
  type ChallengesSegment,
  parseChallengesSegment,
} from '@/lib/challenges-tab';
import { type Theme, useThemedStyles } from '@/theme';

export default function ChallengesTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const { data: session, isPending } = useSession();
  const params = useLocalSearchParams<{ [CHALLENGES_SEGMENT_PARAM]?: string }>();
  const requestedSegment = parseChallengesSegment(params[CHALLENGES_SEGMENT_PARAM]);
  const [segment, setSegment] = useState<ChallengesSegment>(requestedSegment);

  useEffect(() => {
    setSegment(requestedSegment);
  }, [requestedSegment]);

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
        segments={CHALLENGES_SEGMENTS}
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
