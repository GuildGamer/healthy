import type { ActivityProofClip } from '@product/client';
import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useRouter } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';
import { DeckButton, DeckNoteCard, DeckPushedPage, DeckSheetMessage } from '@/components/deck';
import { Loader } from '@/components/feedback';
import { formatPointsDelta } from '@/components/points';
import { type Theme, useThemedStyles } from '@/theme';
import type { completionShareRoute } from './completion-poster';
import { ACTIVITY_COPY, POSE_COPY } from './constants/doing-copy';
import { ProofClipPrimaryRow } from './ProofClipActions';
import { ProofVideoPlayer } from './ProofVideoPlayer';
import { type ActivityClipState, useActivityClip } from './useActivityClip';

const AMOUNT_SIZE = 40;
/** A clip with nothing left to show is a line of text, not a tall empty frame. */
const COMPACT_FRAME_HEIGHT = 96;

/** One thing done, as a History row opens it. */
export type ActivityDetail = {
  title: string;
  amount: string;
  when: string;
  /** Practice earns nothing, so it carries no points line. */
  points: number | null;
  proofClip: ActivityProofClip | null;
  /** Lets a finish History has not caught up with still find its clip on the phone. */
  userChallengeId: string | null;
  shareCard: ReturnType<typeof completionShareRoute> | null;
};

type ActivityDetailScreenProps = {
  detail: ActivityDetail | undefined;
  isPending: boolean;
  onBack: () => void;
  onRefresh: () => Promise<unknown>;
};

/** The clip leads, because it is the proof; the share card is one more thing to do with it. */
export function ActivityDetailScreen({
  detail,
  isPending,
  onBack,
  onRefresh,
}: ActivityDetailScreenProps) {
  return (
    <DeckPushedPage
      onBack={onBack}
      onPullRefresh={onRefresh}
      testID="activity-detail-screen"
      title={detail?.title ?? ''}
    >
      <ActivityBody detail={detail} isPending={isPending} onRetry={() => void onRefresh()} />
    </DeckPushedPage>
  );
}

function ActivityBody({
  detail,
  isPending,
  onRetry,
}: {
  detail: ActivityDetail | undefined;
  isPending: boolean;
  onRetry: () => void;
}) {
  const styles = useThemedStyles(createStyles);

  if (isPending) {
    return (
      <View style={styles.loader}>
        <Loader />
      </View>
    );
  }

  if (!detail) {
    return (
      <DeckNoteCard
        action={{
          label: ACTIVITY_COPY.tryAgain,
          onPress: onRetry,
          testID: 'activity-detail-retry',
        }}
        body={ACTIVITY_COPY.notFoundBody}
        glyph="offline"
        title={ACTIVITY_COPY.notFoundTitle}
      />
    );
  }

  return <ActivityContent detail={detail} />;
}

function ActivityContent({ detail }: { detail: ActivityDetail }) {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const clip = useActivityClip(detail.proofClip, detail.userChallengeId);
  const hasClip = clip.clipId !== null;
  const shareCard = detail.shareCard;
  const meta =
    detail.points === null ? detail.when : `${detail.when} · ${formatPointsDelta(detail.points)}`;

  return (
    <View style={styles.content}>
      {hasClip ? <ClipStage clip={clip} /> : null}
      <View style={styles.facts}>
        <Text style={styles.amount} testID="activity-detail-amount">
          {detail.amount}
        </Text>
        <Text style={styles.meta}>{meta}</Text>
      </View>
      <View style={styles.actions}>
        {clip.proof.error ? <DeckSheetMessage message={clip.proof.error} /> : null}
        {clip.canPublish ? <ProofClipPrimaryRow proof={clip.proof} /> : null}
        {shareCard ? (
          <DeckButton
            label={ACTIVITY_COPY.shareCard}
            onPress={() => router.push(shareCard)}
            testID="activity-detail-share-card"
            variant={clip.canPublish ? 'quiet' : 'primary'}
          />
        ) : null}
      </View>
    </View>
  );
}

function ClipStage({ clip }: { clip: ActivityClipState }) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.stage} testID="activity-detail-clip">
      <ClipFrame clip={clip} />
      {clip.displayCode ? (
        <Text style={styles.code} testID="activity-detail-code">
          {clipCaption(clip)}
        </Text>
      ) : null}
    </View>
  );
}

function ClipFrame({ clip }: { clip: ActivityClipState }) {
  const styles = useThemedStyles(createStyles);

  if (clip.isLoading) {
    return (
      <View style={[styles.frame, styles.centered]}>
        <Loader />
      </View>
    );
  }

  if (clip.videoUri) {
    return (
      <ProofVideoPlayer
        key={clip.videoUri}
        posterUri={clip.posterUri}
        testID="activity-detail-video"
        uri={clip.videoUri}
      />
    );
  }

  return (
    <View
      style={[clip.posterUri ? styles.frame : styles.compactFrame, styles.centered]}
      testID="activity-detail-clip-missing"
    >
      {clip.posterUri ? (
        <Image source={{ uri: clip.posterUri }} style={StyleSheet.absoluteFill} />
      ) : null}
      <Text style={styles.missing}>
        {clip.isExpired ? POSE_COPY.proofExpired : POSE_COPY.proofNotOnPhone}
      </Text>
    </View>
  );
}

function clipCaption(clip: ActivityClipState): string {
  if (clip.publishedAs === 'shared') {
    return `${clip.displayCode} · ${POSE_COPY.proofSharedStatus}`;
  }

  if (clip.publishedAs === 'group') {
    return `${clip.displayCode} · ${POSE_COPY.proofPostedStatus}`;
  }

  return clip.displayCode ?? '';
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    loader: {
      marginTop: spacing.xl,
    },
    content: {
      gap: spacing.lg,
      marginTop: spacing.md,
    },
    stage: {
      alignItems: 'center',
      gap: spacing.sm,
    },
    frame: {
      width: '100%',
      aspectRatio: 9 / 16,
      maxHeight: 420,
      borderRadius: radii.md,
      backgroundColor: '#000',
      overflow: 'hidden',
    },
    compactFrame: {
      width: '100%',
      height: COMPACT_FRAME_HEIGHT,
      borderRadius: radii.md,
      backgroundColor: '#000',
    },
    centered: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    missing: {
      color: '#fff',
      fontSize: fontSize.sm,
      paddingHorizontal: spacing.lg,
      textAlign: 'center',
    },
    code: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      letterSpacing: 1,
    },
    facts: {
      paddingHorizontal: spacing.xs,
    },
    amount: {
      color: theme.colors.text,
      fontSize: AMOUNT_SIZE,
      fontWeight: fontWeight.semibold,
      letterSpacing: -1.5,
      lineHeight: AMOUNT_SIZE + 4,
    },
    meta: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      lineHeight: 21,
      marginTop: 6,
    },
    actions: {
      gap: spacing.sm,
    },
  });
