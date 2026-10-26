import { fontSize, radii, spacing } from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, View } from 'react-native';
import { DeckButton } from '@/components/deck';
import { getLocalProofClip } from '@/lib/proof-clip-store';
import { discardLocalProofClip, uploadProofClip } from '@/lib/proof-clip-upload';
import { type Theme, useThemedStyles } from '@/theme';
import { POSE_COPY } from './constants/doing-copy';
import { saveProofToPhotos } from './save-proof-to-photos';

type ProofClipActionsProps = {
  clipId: string | null;
  /** Group sets post to the board; solo sets share. */
  visibility: 'group' | 'shared';
  /** True when recording was requested but the clip never landed on the phone. */
  failed?: boolean;
};

/**
 * Shows the clip poster and offers Post/Share, Save to Photos, or Discard.
 * Upload happens only when the person chooses to publish.
 */
export function ProofClipActions({ clipId, visibility, failed = false }: ProofClipActionsProps) {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedToPhotos, setSavedToPhotos] = useState(false);
  const localQuery = useQuery({
    queryKey: ['proof-clip-local', clipId],
    queryFn: () => (clipId ? getLocalProofClip(clipId) : Promise.resolve(null)),
    enabled: Boolean(clipId),
  });

  if (failed) {
    return (
      <View style={styles.wrap} testID="proof-clip-failed">
        <Text style={styles.error}>{POSE_COPY.proofFailed}</Text>
      </View>
    );
  }

  if (!clipId) {
    return null;
  }

  async function publish() {
    if (!clipId) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await uploadProofClip({ clipId, visibility });
      router.push({ pathname: '/proof/[clipId]', params: { clipId } } as unknown as Href);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'Could not publish.');
    } finally {
      setBusy(false);
    }
  }

  function confirmDiscard() {
    Alert.alert(POSE_COPY.proofDiscardTitle, POSE_COPY.proofDiscardBody, [
      { text: POSE_COPY.proofDiscardCancel, style: 'cancel' },
      {
        text: POSE_COPY.proofDiscardConfirm,
        style: 'destructive',
        onPress: () => void discard(),
      },
    ]);
  }

  async function discard() {
    if (!clipId) {
      return;
    }
    setBusy(true);
    try {
      await discardLocalProofClip(clipId);
      await localQuery.refetch();
    } finally {
      setBusy(false);
    }
  }

  async function saveToPhotos() {
    const local = localQuery.data;
    if (!local) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const failure = await saveProofToPhotos(local.fileUri);
      if (failure) {
        setError(failure);
        return;
      }
      setSavedToPhotos(true);
    } finally {
      setBusy(false);
    }
  }

  if (localQuery.isPending) {
    return <ActivityIndicator />;
  }

  const local = localQuery.data;
  if (!local) {
    return (
      <View style={styles.wrap} testID="proof-clip-failed">
        <Text style={styles.error}>{POSE_COPY.proofFailed}</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap} testID="proof-clip-actions">
      {local.posterUri ? (
        <Image source={{ uri: local.posterUri }} style={styles.poster} />
      ) : (
        <View style={[styles.poster, styles.posterFallback]}>
          <Text style={styles.posterLabel}>Proof ready</Text>
        </View>
      )}
      <Text style={styles.code}>{local.displayCode}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <DeckButton
        label={visibility === 'group' ? 'Post to group' : 'Share'}
        loading={busy}
        onPress={() => void publish()}
        testID="proof-publish"
      />
      <DeckButton
        label={savedToPhotos ? POSE_COPY.savedToPhotos : POSE_COPY.saveToPhotos}
        loading={busy}
        onPress={() => void saveToPhotos()}
        testID="proof-save-photos"
        variant="quiet"
      />
      <DeckButton
        label="Discard"
        onPress={confirmDiscard}
        testID="proof-discard"
        variant="quiet"
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: {
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    poster: {
      width: '100%',
      aspectRatio: 9 / 16,
      maxHeight: 280,
      borderRadius: radii.md,
      backgroundColor: '#000',
      alignSelf: 'center',
    },
    posterFallback: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    posterLabel: {
      color: '#fff',
      fontSize: fontSize.md,
    },
    code: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      textAlign: 'center',
      letterSpacing: 1,
    },
    error: {
      color: theme.colors.danger,
      fontSize: fontSize.sm,
      textAlign: 'center',
    },
  });
