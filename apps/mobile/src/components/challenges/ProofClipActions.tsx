import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { DeckButton, DeckRoundButton, DeckSheetMessage } from '@/components/deck';
import { Glyph } from '@/components/icons';
import { type Theme, useThemedStyles } from '@/theme';
import { POSE_COPY } from './constants/doing-copy';
import type { ProofClipVisibility } from './types/proof-clip-recording';
import { type ProofClipState, useProofClip } from './useProofClip';

const PLAY_BADGE_SIZE = 56;
const PANEL_POSTER_MAX_HEIGHT = 220;

/**
 * The clip itself: its first frame, a tap to watch it, and the code burned
 * into it. Discard sits with the clip it removes rather than with the buttons.
 * `fill` grows it into the space it is given; otherwise it stays compact.
 */
export function ProofClipHero({ proof, fill = false }: { proof: ProofClipState; fill?: boolean }) {
  const styles = useThemedStyles(createStyles);
  const clip = proof.clip;

  if (!clip) {
    return null;
  }

  return (
    <View style={[styles.hero, fill ? styles.heroFill : null]} testID="proof-clip-hero">
      <Pressable
        accessibilityLabel={POSE_COPY.proofWatch}
        accessibilityRole="button"
        onPress={proof.watch}
        style={({ pressed }) => [
          styles.poster,
          fill ? styles.posterFill : styles.posterCompact,
          pressed ? styles.pressed : null,
        ]}
        testID="proof-clip-watch"
      >
        {clip.posterUri ? (
          <Image source={{ uri: clip.posterUri }} style={StyleSheet.absoluteFill} />
        ) : null}
        <View style={styles.playBadge}>
          <Glyph color="#FFFFFF" name="play" size={24} />
        </View>
      </Pressable>
      <View style={styles.caption}>
        <Text style={styles.code}>{clip.displayCode}</Text>
        <Pressable
          accessibilityRole="button"
          disabled={proof.isBusy}
          hitSlop={spacing.sm}
          onPress={proof.confirmDiscard}
          testID="proof-discard"
        >
          <Text style={styles.discard}>{POSE_COPY.proofDiscard}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** The one solid button is publishing; saving a copy is the icon beside it. */
export function ProofClipPrimaryRow({ proof }: { proof: ProofClipState }) {
  const styles = useThemedStyles(createStyles);

  if (!proof.clip) {
    return null;
  }

  return (
    <View style={styles.primaryRow}>
      <DeckButton
        isFlexible
        label={proof.publishLabel}
        loading={proof.isBusy}
        onPress={proof.publish}
        testID="proof-publish"
      />
      <DeckRoundButton
        accessibilityLabel={proof.hasSavedToPhotos ? POSE_COPY.savedToPhotos : POSE_COPY.saveToPhotos}
        disabled={proof.isBusy || proof.hasSavedToPhotos}
        glyph={proof.hasSavedToPhotos ? 'check' : 'download'}
        onPress={proof.saveToPhotos}
        onSurface
        testID="proof-save-photos"
      />
    </View>
  );
}

type ProofClipActionsProps = {
  clipId: string | null;
  visibility: ProofClipVisibility;
  /** True when recording was requested but the clip never landed on the phone. */
  failed?: boolean;
};

/** A compact clip block for a panel that has its own buttons below it. */
export function ProofClipActions({ clipId, visibility, failed = false }: ProofClipActionsProps) {
  const styles = useThemedStyles(createStyles);
  const proof = useProofClip(clipId, visibility);

  if (failed || proof.isMissing) {
    return (
      <View style={styles.wrap} testID="proof-clip-failed">
        <Text style={styles.error}>{POSE_COPY.proofFailed}</Text>
      </View>
    );
  }

  if (proof.isLoading) {
    return <ActivityIndicator />;
  }

  if (!proof.clip) {
    return null;
  }

  return (
    <View style={styles.wrap} testID="proof-clip-actions">
      <ProofClipHero proof={proof} />
      {proof.error ? <DeckSheetMessage message={proof.error} /> : null}
      <ProofClipPrimaryRow proof={proof} />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: {
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    hero: {
      alignItems: 'center',
      gap: spacing.sm,
    },
    heroFill: {
      flex: 1,
      minHeight: 0,
    },
    poster: {
      aspectRatio: 9 / 16,
      borderRadius: radii.md,
      backgroundColor: '#000000',
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    posterFill: {
      flex: 1,
      maxWidth: '100%',
    },
    posterCompact: {
      height: PANEL_POSTER_MAX_HEIGHT,
    },
    pressed: {
      opacity: 0.85,
    },
    playBadge: {
      width: PLAY_BADGE_SIZE,
      height: PLAY_BADGE_SIZE,
      borderRadius: PLAY_BADGE_SIZE / 2,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    caption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    code: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      letterSpacing: 1,
    },
    discard: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
    },
    primaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    error: {
      color: theme.colors.danger,
      fontSize: fontSize.sm,
      textAlign: 'center',
    },
  });
