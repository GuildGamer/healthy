import { fontSize, fontWeight, spacing } from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { type Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DeckNoteCard, DeckPageNav, DeckSectionTitle } from '@/components/deck';
import { ScreenLoader } from '@/components/feedback';
import { apiClient } from '@/lib/api';
import { goBackOrHome } from '@/lib/go-back';
import { type Theme, useThemedStyles } from '@/theme';
import { GroupPage } from './GroupPage';
import { BOARD_COPY, GROUPS_COPY } from './match-copy';

type MatchMemberActivityScreenProps = {
  matchId: string;
  userId: string;
};

/** One member's sets in this contest. Play opens a clip they posted to the group. */
export function MatchMemberActivityScreen({ matchId, userId }: MatchMemberActivityScreenProps) {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const activityQuery = useQuery({
    queryKey: ['matches', matchId, 'members', userId, 'activity'],
    queryFn: () => apiClient.listMatchMemberActivity({ matchId, userId }),
  });

  if (activityQuery.isPending) {
    return <ScreenLoader testID="match-member-activity-loading" />;
  }

  if (!activityQuery.data) {
    return (
      <GroupPage
        nav={<DeckPageNav onBack={() => goBackOrHome(`/matches/${matchId}`)} />}
        testID="match-member-activity-missing"
      >
        <DeckNoteCard
          action={{ label: GROUPS_COPY.tryAgain, onPress: () => void activityQuery.refetch() }}
          body={GROUPS_COPY.loadFailedBody}
          glyph="offline"
          title={BOARD_COPY.memberActivityFailed}
        />
      </GroupPage>
    );
  }

  const { displayName, attempts } = activityQuery.data;

  return (
    <GroupPage
      nav={<DeckPageNav onBack={() => goBackOrHome(`/matches/${matchId}`)} />}
      testID="match-member-activity-screen"
    >
      <Text style={styles.title}>{displayName}</Text>
      <DeckSectionTitle label={BOARD_COPY.memberAttempts} />
      {attempts.length === 0 ? (
        <Text style={styles.empty}>{BOARD_COPY.memberAttemptsEmpty}</Text>
      ) : (
        attempts.map((attempt, index) => {
          const canPlay = Boolean(attempt.proofClipId);
          return (
            <Pressable
              key={attempt.attemptId}
              accessibilityRole={canPlay ? 'button' : 'text'}
              disabled={!canPlay}
              onPress={
                canPlay
                  ? () =>
                      router.push({
                        pathname: '/proof/[clipId]',
                        params: { clipId: attempt.proofClipId! },
                      } as unknown as Href)
                  : undefined
              }
              style={[styles.row, index === attempts.length - 1 ? styles.rowLast : null]}
              testID={`match-member-attempt-${attempt.attemptId}`}
            >
              <Text style={styles.play}>{canPlay ? '▶' : '·'}</Text>
              <View style={styles.meta}>
                <Text style={styles.count}>{attempt.count}</Text>
                <Text style={styles.when}>{formatAttemptWhen(attempt.performedAt)}</Text>
              </View>
            </Pressable>
          );
        })
      )}
    </GroupPage>
  );
}

function formatAttemptWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    title: {
      color: theme.colors.text,
      fontSize: fontSize.headline,
      fontWeight: fontWeight.semibold,
      letterSpacing: -0.8,
      marginBottom: spacing.sm,
    },
    empty: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      paddingVertical: spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    play: {
      color: theme.colors.accent,
      fontSize: fontSize.md,
      width: 24,
      textAlign: 'center',
    },
    meta: {
      flex: 1,
    },
    count: {
      color: theme.colors.text,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
    },
    when: {
      color: theme.colors.muted,
      fontSize: fontSize.xs,
    },
  });
