import { fontSize, fontWeight, spacing } from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { type Href, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeckPageNav } from '@/components/deck';
import { Glyph } from '@/components/icons';
import { goBackOrHome } from '@/lib/go-back';
import { listLocalProofClips, type LocalProofClip } from '@/lib/proof-clip-store';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { ListSectionTitle } from './ListSectionTitle';

/** Local proof clips still on this phone, newest first. */
export function ProofClipsScreen() {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const clipsQuery = useQuery({
    queryKey: ['proof-clips-local'],
    queryFn: () => listLocalProofClips(),
  });
  const clips = clipsQuery.data ?? [];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.nav}>
        <DeckPageNav onBack={() => goBackOrHome('/(tabs)/profile')} title="Proof clips" />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        testID="proof-clips-screen"
      >
        <ListSectionTitle
          corner={clips.length > 0 ? String(clips.length) : null}
          isFirst
          label="On this phone"
        />
        {clipsQuery.isPending ? (
          <Text style={styles.empty}>Loading…</Text>
        ) : clips.length === 0 ? (
          <Text style={styles.empty}>No proof clips on this phone yet.</Text>
        ) : (
          clips.map((clip, index) => (
            <ProofClipRow clip={clip} isFirst={index === 0} key={clip.clipId} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function ProofClipRow({ clip, isFirst }: { clip: LocalProofClip; isFirst: boolean }) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const when = clip.recordedAt.slice(0, 10);

  return (
    <Pressable
      accessibilityHint="Opens this proof clip"
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: '/proof/[clipId]',
          params: { clipId: clip.clipId },
        } as unknown as Href)
      }
      style={({ pressed }) => [
        styles.row,
        isFirst ? null : styles.divider,
        pressed ? styles.pressed : null,
      ]}
      testID={`proof-clip-row-${clip.clipId}`}
    >
      <View style={styles.rowText}>
        <Text style={styles.code}>{clip.displayCode}</Text>
        <Text style={styles.meta}>
          {when} · {clip.count} reps
        </Text>
      </View>
      <Glyph color={colors.muted} name="play" size={16} strokeWidth={2} />
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    nav: {
      paddingHorizontal: spacing.md,
    },
    content: {
      paddingHorizontal: spacing.md,
    },
    empty: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      paddingHorizontal: spacing.xs,
      marginTop: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xs,
    },
    divider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    pressed: {
      opacity: 0.7,
    },
    rowText: {
      flex: 1,
      minWidth: 0,
    },
    code: {
      color: theme.colors.text,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      letterSpacing: 1,
    },
    meta: {
      color: theme.colors.muted,
      fontSize: fontSize.xs,
      marginTop: 2,
    },
  });
