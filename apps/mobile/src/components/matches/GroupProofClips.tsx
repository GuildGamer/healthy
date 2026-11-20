import { fontSize, spacing } from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { type Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DeckSectionTitle } from '@/components/deck';
import { apiClient } from '@/lib/api';
import { type Theme, useThemedStyles } from '@/theme';
import { BOARD_COPY } from './match-copy';

/**
 * The group's posted proof clips — a play affordance, not a feed. Today's while
 * the group runs; once it has finished, every day's, so they stay reachable.
 */
export function GroupProofClips({ matchId, isFinished }: { matchId: string; isFinished: boolean }) {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const clipsQuery = useQuery({
    queryKey: ['proof-clips', 'match', matchId, isFinished ? 'all' : 'today'],
    queryFn: () => apiClient.listMatchProofClips({ matchId, allDays: isFinished }),
  });

  const clips = clipsQuery.data?.clips ?? [];

  return (
    <View testID="group-proof-clips">
      {clips.length > 0 ? (
        <>
          <DeckSectionTitle label={isFinished ? BOARD_COPY.proofAllDays : BOARD_COPY.proofToday} />
          {clips.map((clip, index) => (
            <Pressable
              key={clip.id}
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/proof/[clipId]',
                  params: { clipId: clip.id },
                } as unknown as Href)
              }
              style={[styles.row, index === clips.length - 1 ? styles.rowLast : null]}
              testID={`group-proof-clip-${clip.id}`}
            >
              <Text style={styles.play}>▶</Text>
              <View style={styles.meta}>
                <Text style={styles.name}>{clip.displayName}</Text>
                <Text style={styles.code}>{clip.displayCode}</Text>
              </View>
              <Text style={styles.count}>{clip.count}</Text>
            </Pressable>
          ))}
        </>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/v/new' as Href)}
        style={[styles.verifyRow, clips.length > 0 ? styles.verifyAfterClips : null]}
        testID="group-verify-clip"
      >
        <Text style={styles.verifyLabel}>{BOARD_COPY.verifyClip}</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
    name: {
      color: theme.colors.text,
      fontSize: fontSize.sm,
    },
    code: {
      color: theme.colors.muted,
      fontSize: fontSize.xs,
      letterSpacing: 0.6,
    },
    count: {
      color: theme.colors.text,
      fontSize: fontSize.md,
      fontWeight: '600',
    },
    verifyRow: {
      paddingVertical: spacing.sm,
    },
    verifyAfterClips: {
      marginTop: spacing.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      paddingTop: spacing.md,
    },
    verifyLabel: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
    },
  });
