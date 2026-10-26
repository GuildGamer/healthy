import { fontSize, radii, spacing } from '@product/brand';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeckButton, DeckNavButton } from '@/components/deck';
import { ScreenLoader } from '@/components/feedback';
import { apiClient } from '@/lib/api';
import { useSession } from '@/lib/auth-client';
import { getLocalProofClip } from '@/lib/proof-clip-store';
import { type Theme, useThemedStyles } from '@/theme';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function ProofClipViewerRoute() {
  const { data: session, isPending } = useSession();
  const params = useLocalSearchParams<{ clipId?: string | string[] }>();
  const clipId = firstParam(params.clipId);
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);

  const clipQuery = useQuery({
    queryKey: ['proof-clip', clipId],
    queryFn: async () => {
      if (!clipId) {
        return null;
      }
      const local = await getLocalProofClip(clipId);
      try {
        const remote = await apiClient.getProofClip({ clipId });
        return { remote, local };
      } catch {
        return { remote: null, local };
      }
    },
    enabled: Boolean(clipId) && Boolean(session),
  });

  const report = useMutation({
    mutationFn: () =>
      apiClient.reportProofClip({ clipId: clipId!, reason: 'inappropriate' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['proof-clip', clipId] });
      router.back();
    },
  });

  const block = useMutation({
    mutationFn: async () => {
      const ownerId = clipQuery.data?.remote?.isOwner
        ? null
        : clipQuery.data?.remote
          ? (
              await apiClient.listMatchProofClips({
                matchId: clipQuery.data.remote.matchId!,
              })
            ).clips.find((c) => c.id === clipId)?.userId
          : null;
      if (!ownerId) {
        return;
      }
      await apiClient.blockUser({ userId: ownerId });
    },
    onSuccess: () => router.back(),
  });

  if (isPending) {
    return <ScreenLoader />;
  }
  if (!session) {
    return <Redirect href="/login" />;
  }
  if (!clipId) {
    return <Redirect href="/(tabs)" />;
  }

  const remote = clipQuery.data?.remote;
  const local = clipQuery.data?.local;
  const posterUri = remote?.posterUrl ?? local?.posterUri ?? null;
  const videoUri = remote?.videoUrl ?? local?.fileUri ?? null;

  return (
    <SafeAreaView style={styles.screen} testID="proof-viewer">
      <View style={styles.top}>
        <DeckNavButton accessibilityLabel="Close" glyph="close" onPress={() => router.back()} />
        <Text style={styles.title}>{remote?.displayCode ?? local?.displayCode ?? 'Proof'}</Text>
        <Pressable onPress={() => setMenuOpen((open) => !open)} testID="proof-overflow">
          <Text style={styles.menu}>···</Text>
        </Pressable>
      </View>

      {clipQuery.isPending ? (
        <ActivityIndicator />
      ) : (
        <View style={styles.body}>
          {posterUri ? (
            <Image source={{ uri: posterUri }} style={styles.poster} />
          ) : (
            <View style={[styles.poster, styles.fallback]}>
              <Text style={styles.fallbackText}>No preview</Text>
            </View>
          )}
          {remote ? (
            <Text style={styles.meta}>
              {remote.count} · recorded {remote.recordedAt?.slice(0, 10) ?? ''}
              {remote.attested ? ' · attested' : ''}
            </Text>
          ) : null}
          {videoUri ? (
            <DeckButton
              label="Open clip"
              onPress={() => void Linking.openURL(videoUri)}
              testID="proof-open"
            />
          ) : null}
        </View>
      )}

      {menuOpen ? (
        <View style={styles.overflow}>
          {!remote?.isOwner ? (
            <>
              <DeckButton
                label="Report"
                loading={report.isPending}
                onPress={() => report.mutate()}
                testID="proof-report"
                variant="quiet"
              />
              <DeckButton
                label="Block"
                loading={block.isPending}
                onPress={() => block.mutate()}
                testID="proof-block"
                variant="quiet"
              />
            </>
          ) : (
            <DeckButton
              label="Remove"
              onPress={() => {
                void apiClient.removeProofClip({ clipId }).then(() => router.back());
              }}
              testID="proof-remove"
              variant="quiet"
            />
          )}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingHorizontal: spacing.md,
    },
    top: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    title: {
      color: theme.colors.text,
      fontSize: fontSize.md,
      letterSpacing: 1,
    },
    menu: {
      color: theme.colors.text,
      fontSize: fontSize.lg,
      paddingHorizontal: spacing.sm,
    },
    body: {
      gap: spacing.md,
      alignItems: 'center',
    },
    poster: {
      width: '100%',
      aspectRatio: 9 / 16,
      maxHeight: 420,
      borderRadius: radii.md,
      backgroundColor: '#000',
    },
    fallback: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    fallbackText: {
      color: '#fff',
    },
    meta: {
      color: theme.colors.mutedText,
      fontSize: fontSize.sm,
    },
    overflow: {
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
  });
