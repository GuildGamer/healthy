import type { MatchBoard, MatchHonor } from '@product/client';
import { fontSize, fontWeight, spacing } from '@product/brand';
import { StyleSheet, View } from 'react-native';
import {
  SHARE_POSTER_HEIGHT,
  SHARE_POSTER_PADDING,
  SHARE_POSTER_RADIUS,
  SHARE_POSTER_WIDTH,
} from '@/components/challenges/SharePosterCard';
import { SharePosterText } from '@/components/challenges/SharePosterText';
import { ShareBrandLockup } from '@/components/share/ShareBrandLockup';
import { GroupFace } from './GroupFace';
import { honorCardTitle, honorChallengeTitle, honorMetaLine } from './honor-copy';
import { honorFillFor, honorInkFor } from './honor-palettes';

/**
 * Deck poster for one group honor: identity, brag title, proof, contest meta.
 * Pass width/height for the in-app preview; the capture twin keeps design size.
 */
export function HonorShareCard({
  board,
  honor,
  isHolder,
  corners = 'round',
  width = SHARE_POSTER_WIDTH,
  height = SHARE_POSTER_HEIGHT,
}: {
  board: MatchBoard;
  honor: MatchHonor;
  isHolder: boolean;
  corners?: 'round' | 'square';
  width?: number;
  height?: number;
}) {
  const challenge = honorChallengeTitle(board);
  const title = honorCardTitle(honor, isHolder);
  const standing = board.standings.find((row) => row.userId === honor.userId);
  const ink = honorInkFor(honor.palette);
  const radius = corners === 'round' ? SHARE_POSTER_RADIUS : 0;
  const layoutScale = width / SHARE_POSTER_WIDTH;
  const pad = SHARE_POSTER_PADDING * layoutScale;
  const faceSize = Math.round(40 * layoutScale);

  return (
    <View
      style={[styles.shell, { width, height }, corners === 'round' ? { borderRadius: radius } : null]}
      testID={`honor-share-card-${honor.kind}`}
    >
      <View
        style={[styles.fill, { backgroundColor: honorFillFor(honor.palette), borderRadius: radius }]}
      />
      <View style={[styles.type, { padding: pad }]}>
        <View style={[styles.identity, { gap: 12 * layoutScale }]}>
          <GroupFace
            image={standing?.image}
            look="lit"
            name={honor.displayName}
            size={faceSize}
            userId={honor.userId}
          />
          <View style={styles.identityText}>
            <SharePosterText
              style={[styles.name, { color: ink.text, fontSize: 15 * layoutScale }]}
            >
              {honor.displayName}
            </SharePosterText>
            {challenge ? (
              <SharePosterText
                style={[
                  styles.challenge,
                  {
                    color: ink.sub,
                    fontSize: 13 * layoutScale,
                    marginTop: 2 * layoutScale,
                  },
                ]}
              >
                {challenge}
              </SharePosterText>
            ) : null}
          </View>
        </View>
        <View style={[styles.spacer, { minHeight: 12 * layoutScale }]} />
        <SharePosterText
          style={[
            styles.title,
            {
              color: ink.text,
              fontSize: 30 * layoutScale,
              lineHeight: 34 * layoutScale,
            },
          ]}
        >
          {title}
        </SharePosterText>
        <SharePosterText
          style={[
            styles.proof,
            {
              color: ink.sub,
              fontSize: 16 * layoutScale,
              marginTop: spacing.sm * layoutScale,
            },
          ]}
        >
          {honor.proof}
        </SharePosterText>
        <SharePosterText
          style={[
            styles.meta,
            {
              color: ink.sub,
              fontSize: (fontSize.sm - 1) * layoutScale,
              marginTop: 10 * layoutScale,
            },
          ]}
        >
          {honorMetaLine(board)}
        </SharePosterText>
        <View
          style={[
            styles.brand,
            {
              borderTopColor: ink.track,
              marginTop: 14 * layoutScale,
              paddingTop: 14 * layoutScale,
            },
          ]}
        >
          <ShareBrandLockup color={ink.text} height={Math.round(40 * layoutScale)} />
          <SharePosterText
            style={[
              styles.meta,
              {
                color: ink.sub,
                fontSize: (fontSize.sm - 1) * layoutScale,
                marginTop: 0,
              },
            ]}
          >
            {honor.kind === 'champion' ? 'Won' : honor.title.replace(/[!]$/, '')}
          </SharePosterText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {},
  fill: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  type: {
    flex: 1,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  identityText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontWeight: fontWeight.semibold,
  },
  challenge: {
    fontWeight: fontWeight.medium,
  },
  spacer: {
    flex: 1,
  },
  title: {
    fontWeight: fontWeight.bold,
  },
  proof: {},
  meta: {
    fontWeight: fontWeight.medium,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
