import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import type { ProofClipAudience } from '@product/client';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { apiClient } from '@/lib/api';
import { proofClipMaxDurationSeconds } from '@/lib/proof-clip-max-duration';
import {
  DeckButton,
  DeckRoundButton,
  DeckSheetMessage,
} from '@/components/deck';
import { type Theme, useThemedStyles } from '@/theme';
import { POSE_COPY } from './constants/doing-copy';
import { ProofClipAudienceControl } from './ProofClipAudienceControl';
import { ProofPlayBadge } from './ProofPlayBadge';
import { ProofVideoPlayer } from './ProofVideoPlayer';
import { type ProofClipState, useProofClip } from './useProofClip';

const PANEL_POSTER_MAX_HEIGHT = 220;

/**
 * The clip itself: first frame and a tap to watch. On History, the code and
 * Discard sit under the player. Finish hides that chrome — the code is already
 * burned into the video — and must not push the bare proof viewer, or canceling
 * Instagram / X leaves the person on a dead-end clip page under the share row.
 * `fill` grows it into the space it is given; otherwise it stays compact.
 */
export function ProofClipHero({
  proof,
  fill = false,
  showMeta = true,
  opensViewer = true,
  maxDurationSeconds,
}: {
  proof: ProofClipState;
  fill?: boolean;
  /** Code + Discard under the player. Off on the finish screen. */
  showMeta?: boolean;
  /**
   * When false, the poster stays put (finish share screen). A tap must not
   * stack `/proof/[clipId]` on top of the destination row.
   */
  opensViewer?: boolean;
  maxDurationSeconds: number;
}) {
  const styles = useThemedStyles(createStyles);
  const clip = proof.clip;

  if (!clip) {
    return null;
  }

  const posterStyle = [styles.poster, fill ? styles.posterFill : styles.posterCompact];

  return (
    <View style={[styles.hero, fill ? styles.heroFill : null]} testID="proof-clip-hero">
      {opensViewer ? (
        <Pressable
          accessibilityLabel={POSE_COPY.proofWatch}
          accessibilityRole="button"
          onPress={proof.watch}
          style={({ pressed }) => [...posterStyle, pressed ? styles.pressed : null]}
          testID="proof-clip-watch"
        >
          {clip.posterUri ? (
            <Image source={{ uri: clip.posterUri }} style={StyleSheet.absoluteFill} />
          ) : null}
          <ProofPlayBadge />
        </Pressable>
      ) : (
        <View style={posterStyle} testID="proof-clip-watch">
          {clip.fileUri ? (
            <ProofVideoPlayer posterUri={clip.posterUri} uri={clip.fileUri} />
          ) : (
            <>
              {clip.posterUri ? (
                <Image source={{ uri: clip.posterUri }} style={StyleSheet.absoluteFill} />
              ) : null}
              <ProofPlayBadge />
            </>
          )}
        </View>
      )}
      {showMeta ? (
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
      ) : null}
    </View>
  );
}

/** Audience control plus Send/Post and Save. One solid button, quiet companions. */
export function ProofClipPrimaryRow({
  proof,
  showNarrowedHint = false,
  maxDurationSeconds,
}: {
  proof: ProofClipState;
  showNarrowedHint?: boolean;
  maxDurationSeconds: number;
}) {
  const styles = useThemedStyles(createStyles);

  if (!proof.clip) {
    return null;
  }

  return (
    <View style={styles.primaryBlock}>
      <ProofClipAudienceControl
        onChange={(next) => void proof.setAudience(next)}
        showNarrowedHint={showNarrowedHint}
        value={proof.audience}
      />
      <View style={styles.primaryRow}>
        <DeckButton
          isFlexible
          label={proof.isBusy && proof.audience === 'anyone' ? proof.busyLabel : proof.primaryLabel}
          loading={proof.isBusy}
          onPress={proof.primary}
          testID="proof-primary"
        />
        {proof.isGroup ? (
          <DeckRoundButton
            accessibilityLabel={POSE_COPY.proofSend}
            disabled={proof.isBusy}
            glyph="share"
            onPress={proof.send}
            onSurface
            testID="proof-send"
          />
        ) : null}
        <DeckRoundButton
          accessibilityLabel={POSE_COPY.saveToPhotos}
          disabled={proof.isBusy}
          glyph="download"
          onPress={proof.saveToPhotos}
          onSurface
          testID="proof-save-photos"
        />
      </View>
      {proof.allowSendWithoutCheck ? (
        <Pressable
          accessibilityRole="button"
          onPress={proof.sendWithoutCheck}
          testID="proof-send-without-check"
        >
          <Text style={styles.quietLink}>{POSE_COPY.proofSendWithoutCheck}</Text>
        </Pressable>
      ) : null}
      {proof.statusLine ? (
        <Text accessibilityLiveRegion="polite" style={styles.hint} testID="proof-status-line">
          {proof.statusLine}
        </Text>
      ) : null}
      {proof.clip && proof.clip.durationSeconds >= maxDurationSeconds ? (
        <Text style={styles.hint} testID="proof-clip-capped">
          {POSE_COPY.clipCapped(maxDurationSeconds / 60, proof.clip.count)}
        </Text>
      ) : null}
    </View>
  );
}

type ProofClipActionsProps = {
  clipId: string | null;
  audience: ProofClipAudience;
  isGroup?: boolean;
  /** True when recording was requested but the clip never landed on the phone. */
  failed?: boolean;
};

/** A compact clip block for a panel that has its own buttons below it. */
export function ProofClipActions({
  clipId,
  audience,
  isGroup = false,
  failed = false,
}: ProofClipActionsProps) {
  const styles = useThemedStyles(createStyles);
  const proof = useProofClip(clipId, audience, { isGroup });
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.me(),
    staleTime: 60_000,
  });
  const maxDurationSeconds = proofClipMaxDurationSeconds(meQuery.data?.proofClipLimits);

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
      <ProofClipHero maxDurationSeconds={maxDurationSeconds} proof={proof} />
      {proof.error ? <DeckSheetMessage message={proof.error} /> : null}
      <ProofClipPrimaryRow maxDurationSeconds={maxDurationSeconds} proof={proof} />
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
    primaryBlock: {
      gap: spacing.sm,
    },
    primaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    hint: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      textAlign: 'center',
    },
    quietLink: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      textAlign: 'center',
      fontWeight: fontWeight.medium,
    },
    error: {
      color: theme.colors.danger,
      fontSize: fontSize.sm,
      textAlign: 'center',
    },
  });
