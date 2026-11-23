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
import { ShareBrandLockup } from '@/components/share';
import { GroupFace } from './GroupFace';
import { honorCardTitle, honorChallengeTitle, honorMetaLine } from './honor-copy';
import { honorFillFor, honorInkFor } from './honor-palettes';

/**
 * Deck poster for one group honor: identity, brag title, proof, contest meta.
 */
export function HonorShareCard({
  board,
  honor,
  isHolder,
  corners = 'round',
}: {
  board: MatchBoard;
  honor: MatchHonor;
  isHolder: boolean;
  corners?: 'round' | 'square';
}) {
  const challenge = honorChallengeTitle(board);
  const title = honorCardTitle(honor, isHolder);
  const standing = board.standings.find((row) => row.userId === honor.userId);
  const ink = honorInkFor(honor.palette);
  const radius = corners === 'round' ? SHARE_POSTER_RADIUS : 0;

  return (
    <View
      style={[styles.shell, corners === 'round' ? styles.shellRound : null]}
      testID={`honor-share-card-${honor.kind}`}
    >
      <View
        style={[styles.fill, { backgroundColor: honorFillFor(honor.palette), borderRadius: radius }]}
      />
      <View style={styles.type}>
        <View style={styles.identity}>
          <GroupFace
            image={standing?.image}
            look="lit"
            name={honor.displayName}
            size={40}
            userId={honor.userId}
          />
          <View style={styles.identityText}>
            <SharePosterText style={[styles.name, { color: ink.text }]}>
              {honor.displayName}
            </SharePosterText>
            {challenge ? (
              <SharePosterText style={[styles.challenge, { color: ink.sub }]}>
                {challenge}
              </SharePosterText>
            ) : null}
          </View>
        </View>
        <View style={styles.spacer} />
        <SharePosterText style={[styles.title, { color: ink.text }]}>{title}</SharePosterText>
        <SharePosterText style={[styles.proof, { color: ink.sub }]}>{honor.proof}</SharePosterText>
        <SharePosterText style={[styles.meta, { color: ink.sub }]}>
          {honorMetaLine(board)}
        </SharePosterText>
        <View style={[styles.brand, { borderTopColor: ink.track }]}>
          <ShareBrandLockup color={ink.text} />
          <SharePosterText style={[styles.meta, { color: ink.sub }]}>
            {honor.kind === 'champion' ? 'Won' : honor.title.replace(/[!]$/, '')}
          </SharePosterText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: SHARE_POSTER_WIDTH,
    height: SHARE_POSTER_HEIGHT,
  },
  shellRound: {
    borderRadius: SHARE_POSTER_RADIUS,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  type: {
    flex: 1,
    padding: SHARE_POSTER_PADDING,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  identityText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: fontWeight.semibold,
  },
  challenge: {
    fontSize: 13,
    fontWeight: fontWeight.medium,
    marginTop: 2,
  },
  spacer: {
    flex: 1,
    minHeight: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: fontWeight.bold,
    lineHeight: 34,
  },
  proof: {
    fontSize: 16,
    marginTop: spacing.sm,
  },
  meta: {
    fontSize: fontSize.sm - 1,
    fontWeight: fontWeight.medium,
    marginTop: 10,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
