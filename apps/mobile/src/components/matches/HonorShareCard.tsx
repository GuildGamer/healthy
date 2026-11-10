import type { MatchBoard, MatchHonor } from '@product/client';
import { fontSize, fontWeight, spacing } from '@product/brand';
import { StyleSheet, View } from 'react-native';
import {
  SHARE_POSTER_HEIGHT,
  SHARE_POSTER_PADDING,
  SHARE_POSTER_RADIUS,
  SHARE_POSTER_WIDTH,
} from '@/components/challenges/SharePosterCard';
import { SHARE_COPY } from '@/components/challenges/constants/doing-copy';
import { SharePosterText } from '@/components/challenges/SharePosterText';
import { useTheme } from '@/theme';
import { GroupFace } from './GroupFace';
import { honorCardTitle, honorChallengeTitle, honorMetaLine } from './honor-copy';
import { honorFillFor } from './honor-palettes';

const INK = {
  text: '#F4F2EE',
  sub: '#B8B4AD',
  track: '#3D3A45',
} as const;

/**
 * Deck poster for one group honor: identity, brag title, proof, contest meta.
 */
export function HonorShareCard({
  board,
  honor,
  isHolder,
}: {
  board: MatchBoard;
  honor: MatchHonor;
  isHolder: boolean;
}) {
  const theme = useTheme();
  const challenge = honorChallengeTitle(board);
  const title = honorCardTitle(honor, isHolder);
  const standing = board.standings.find((row) => row.userId === honor.userId);

  return (
    <View style={styles.shell} testID={`honor-share-card-${honor.kind}`}>
      <View style={[styles.fill, { backgroundColor: honorFillFor(honor.palette) }]} />
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
            <SharePosterText style={[styles.name, { color: INK.text }]}>
              {honor.displayName}
            </SharePosterText>
            {challenge ? (
              <SharePosterText style={[styles.challenge, { color: INK.sub }]}>
                {challenge}
              </SharePosterText>
            ) : null}
          </View>
        </View>
        <View style={styles.spacer} />
        <SharePosterText style={[styles.title, { color: INK.text }]}>{title}</SharePosterText>
        <SharePosterText style={[styles.proof, { color: INK.sub }]}>{honor.proof}</SharePosterText>
        <SharePosterText style={[styles.meta, { color: INK.sub }]}>
          {honorMetaLine(board)}
        </SharePosterText>
        <View style={[styles.brand, { borderTopColor: theme.deckCards.track ?? INK.track }]}>
          <SharePosterText style={[styles.brandName, { color: INK.text }]}>
            {SHARE_COPY.brand}
          </SharePosterText>
          <SharePosterText style={[styles.meta, { color: INK.sub }]}>
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
  fill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: SHARE_POSTER_RADIUS,
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
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  brandName: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
  },
});
