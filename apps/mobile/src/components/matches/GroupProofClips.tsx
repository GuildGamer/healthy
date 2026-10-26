import { fontSize, spacing } from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { type Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DeckSectionTitle } from '@/components/deck';
import { apiClient } from '@/lib/api';
import { type Theme, useThemedStyles } from '@/theme';

/** Today's posted proof clips for this group — a play affordance, not a feed. */
export function GroupProofClips({ matchId }: { matchId: string }) {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const clipsQuery = useQuery({
    queryKey: ['proof-clips', 'match', matchId],
    queryFn: () => apiClient.listMatchProofClips({ matchId }),
  });

  const clips = clipsQuery.data?.clips ?? [];
  if (clips.length === 0) {
    return null;
  }

  return (
    <View testID="group-proof-clips">
      <DeckSectionTitle label="Proof today" />
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
  });
