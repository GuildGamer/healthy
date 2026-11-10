import type { MatchBoard } from '@product/client';
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
import { honorBoardLine, honorChallengeTitle, honorMetaLine } from './honor-copy';
import { honorFillFor } from './honor-palettes';

const INK = {
  text: '#F4F2EE',
  sub: '#B8B4AD',
  track: '#3D3A45',
} as const;

/** Summary poster listing who earned which honor. */
export function GroupHonorsBoardCard({ board }: { board: MatchBoard }) {
  const honors = board.honors ?? [];
  const challenge = honorChallengeTitle(board);

  return (
    <View style={styles.shell} testID="match-honors-board-card">
      <View style={[styles.fill, { backgroundColor: honorFillFor('honors_board') }]} />
      <View style={styles.type}>
        <SharePosterText style={[styles.eyebrow, { color: INK.sub }]}>
          {challenge ?? honorMetaLine(board)}
        </SharePosterText>
        <SharePosterText style={[styles.title, { color: INK.text }]}>Honors</SharePosterText>
        <View style={styles.list}>
          {honors.slice(0, 6).map((row) => (
            <SharePosterText
              key={`${row.kind}-${row.userId}`}
              style={[styles.line, { color: INK.sub }]}
            >
              {honorBoardLine(row)}
            </SharePosterText>
          ))}
        </View>
        <View style={[styles.brand, { borderTopColor: INK.track }]}>
          <SharePosterText style={[styles.brandName, { color: INK.text }]}>
            {SHARE_COPY.brand}
          </SharePosterText>
          <SharePosterText style={[styles.eyebrow, { color: INK.sub }]}>
            {`${board.participantCount} people`}
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
  eyebrow: {
    fontSize: fontSize.sm - 1,
    fontWeight: fontWeight.medium,
  },
  title: {
    fontSize: 28,
    fontWeight: fontWeight.bold,
    marginTop: spacing.md,
  },
  list: {
    marginTop: spacing.lg,
    gap: 8,
    flex: 1,
  },
  line: {
    fontSize: 14,
    lineHeight: 20,
  },
  brand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  brandName: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
  },
});
