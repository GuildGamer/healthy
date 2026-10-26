import { fontSize, radii, spacing } from '@product/brand';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type Href, Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeckButton, DeckNavButton, DeckPageNav } from '@/components/deck';
import { ScreenLoader } from '@/components/feedback';
import { POSE_COPY } from '@/components/challenges/constants/doing-copy';
import { ProofVideoPlayer } from '@/components/challenges/ProofVideoPlayer';
import { saveProofToPhotos } from '@/components/challenges/save-proof-to-photos';
import { apiClient } from '@/lib/api';
import { useSession } from '@/lib/auth-client';
import { goBackOrHome } from '@/lib/go-back';
import { getLocalProofClip } from '@/lib/proof-clip-store';
import { type Theme, useThemedStyles } from '@/theme';

const PROOF_CLIPS_HREF: Href = '/proof';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function leaveViewer(): void {
  goBackOrHome(PROOF_CLIPS_HREF);
}

export default function ProofClipViewerRoute() {
  const { data: session, isPending } = useSession();
  const params = useLocalSearchParams<{ clipId?: string | string[] }>();
  const clipId = firstParam(params.clipId);
  const styles = useThemedStyles(createStyles);
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [photosMessage, setPhotosMessage] = useState<string | null>(null);
  const [savingPhotos, setSavingPhotos] = useState(false);

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
      leaveViewer();
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
    onSuccess: leaveViewer,
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
  const canSaveToPhotos = Boolean(local?.fileUri) && (remote?.isOwner !== false || !remote);

  async function onSaveToPhotos() {
    if (!local?.fileUri) {
      return;
    }
    setSavingPhotos(true);
    setPhotosMessage(null);
    try {
      const failure = await saveProofToPhotos(local.fileUri);
      setPhotosMessage(failure ?? POSE_COPY.savedToPhotos);
    } finally {
      setSavingPhotos(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} testID="proof-viewer">
      <View style={styles.nav}>
        <DeckPageNav
          isClose
          onBack={leaveViewer}
          right={
            <DeckNavButton
              accessibilityLabel="More"
              glyph="more"
              onPage
              onPress={() => setMenuOpen((open) => !open)}
              testID="proof-overflow"
            />
          }
          title={remote?.displayCode ?? local?.displayCode ?? 'Proof'}
        />
      </View>

      {clipQuery.isPending ? (
        <ActivityIndicator />
      ) : (
        <View style={styles.body}>
          {videoUri ? (
            <ProofVideoPlayer posterUri={posterUri} uri={videoUri} />
          ) : posterUri ? (
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
          {canSaveToPhotos ? (
            <DeckButton
              label={
                photosMessage === POSE_COPY.savedToPhotos
                  ? POSE_COPY.savedToPhotos
                  : POSE_COPY.saveToPhotos
              }
              loading={savingPhotos}
              onPress={() => void onSaveToPhotos()}
              testID="proof-save-photos"
              variant="quiet"
            />
          ) : null}
          {photosMessage && photosMessage !== POSE_COPY.savedToPhotos ? (
            <Text style={styles.error}>{photosMessage}</Text>
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
                void apiClient.removeProofClip({ clipId }).then(leaveViewer);
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
    nav: {
      marginBottom: spacing.md,
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
      color: theme.colors.muted,
      fontSize: fontSize.sm,
    },
    error: {
      color: theme.colors.danger,
      fontSize: fontSize.sm,
      textAlign: 'center',
    },
    overflow: {
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
  });
