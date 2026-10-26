import { fontSize, radii, spacing } from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { DeckButton } from '@/components/deck';
import { getLocalProofClip } from '@/lib/proof-clip-store';
import { discardLocalProofClip, uploadProofClip } from '@/lib/proof-clip-upload';
import { type Theme, useThemedStyles } from '@/theme';

type ProofClipActionsProps = {
  clipId: string;
  /** Group sets post to the board; solo sets share. */
  visibility: 'group' | 'shared';
};

/**
 * Shows the clip poster and offers Post/Share or Discard. Upload happens only
 * when the person chooses to publish.
 */
export function ProofClipActions({ clipId, visibility }: ProofClipActionsProps) {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const localQuery = useQuery({
    queryKey: ['proof-clip-local', clipId],
    queryFn: () => getLocalProofClip(clipId),
  });

  async function publish() {
    setBusy(true);
    setError(null);
    try {
      await uploadProofClip({ clipId, visibility });
      router.push({ pathname: '/proof/[clipId]', params: { clipId } });
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'Could not publish.');
    } finally {
      setBusy(false);
    }
  }

  async function discard() {
    setBusy(true);
    try {
      await discardLocalProofClip(clipId);
    } finally {
      setBusy(false);
    }
  }

  if (localQuery.isPending) {
    return <ActivityIndicator />;
  }

  const local = localQuery.data;
  if (!local) {
    return null;
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
        label="Discard"
        onPress={() => void discard()}
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
      color: theme.colors.mutedText,
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
