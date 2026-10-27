import type { ProofClipAudience } from '@product/client';
import { fontSize, fontWeight, spacing } from '@product/brand';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeckPageNav, DeckSelectRow } from '@/components/deck';
import { Glyph } from '@/components/icons';
import { apiClient } from '@/lib/api';
import { goBackOrHome } from '@/lib/go-back';
import { listLocalProofClips, type LocalProofClip } from '@/lib/proof-clip-store';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { POSE_COPY } from './constants/doing-copy';
import { ListSectionTitle } from './ListSectionTitle';

/** Local proof clips still on this phone, newest first, plus the default for new clips. */
export function ProofClipsScreen() {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const queryClient = useQueryClient();
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.me(),
  });
  const clipsQuery = useQuery({
    queryKey: ['proof-clips-local'],
    queryFn: () => listLocalProofClips(),
  });
  const updateAudience = useMutation({
    mutationFn: (audience: ProofClipAudience) =>
      apiClient.updateProofClipAudience({ audience }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
  const clips = clipsQuery.data ?? [];
  const selected = meQuery.data?.proofClipAudience ?? 'anyone';

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.nav}>
        <DeckPageNav onBack={() => goBackOrHome('/(tabs)/profile')} title="Proof clips" />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        testID="proof-clips-screen"
      >
        <ListSectionTitle isFirst label="New clips" />
        <Text style={styles.sectionHint}>You can still change any single clip.</Text>
        <DeckSelectRow
          isFirst
          isSelected={selected === 'anyone'}
          onPress={() => updateAudience.mutate('anyone')}
          testID="settings-proof-audience-anyone"
          title={POSE_COPY.audienceAnyone}
        />
        <DeckSelectRow
          isSelected={selected === 'only_me'}
          meta={POSE_COPY.audienceOnlyMeSub}
          onPress={() => updateAudience.mutate('only_me')}
          testID="settings-proof-audience-only-me"
          title={POSE_COPY.audienceOnlyMe}
        />

        <ListSectionTitle
          corner={clips.length > 0 ? String(clips.length) : null}
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
        })
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
      paddingTop: spacing.md,
    },
    sectionHint: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      marginBottom: spacing.sm,
    },
    empty: {
      color: theme.colors.muted,
      fontSize: fontSize.md,
      paddingVertical: spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
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
      gap: 2,
    },
    code: {
      color: theme.colors.text,
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
      letterSpacing: 1,
    },
    meta: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
    },
  });
