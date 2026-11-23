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
import { honorFillFor, honorInkFor } from './honor-palettes';

/** Summary poster listing who earned which honor. */
export function GroupHonorsBoardCard({
  board,
  corners = 'round',
}: {
  board: MatchBoard;
  corners?: 'round' | 'square';
}) {
  const honors = board.honors ?? [];
  const challenge = honorChallengeTitle(board);
  const ink = honorInkFor('honors_board');
  const radius = corners === 'round' ? SHARE_POSTER_RADIUS : 0;

  return (
    <View style={styles.shell} testID="match-honors-board-card">
      <View
        style={[
          styles.fill,
          { backgroundColor: honorFillFor('honors_board'), borderRadius: radius },
        ]}
      />
      <View style={styles.type}>
        <SharePosterText style={[styles.eyebrow, { color: ink.sub }]}>
          {challenge ?? honorMetaLine(board)}
        </SharePosterText>
        <SharePosterText style={[styles.title, { color: ink.text }]}>Honors</SharePosterText>
        <View style={styles.list}>
          {honors.slice(0, 6).map((row) => (
            <SharePosterText
              key={`${row.kind}-${row.userId}`}
              style={[styles.line, { color: ink.sub }]}
            >
              {honorBoardLine(row)}
            </SharePosterText>
          ))}
        </View>
        <View style={[styles.brand, { borderTopColor: ink.track }]}>
          <SharePosterText style={[styles.brandName, { color: ink.text }]}>
            {SHARE_COPY.brand}
          </SharePosterText>
          <SharePosterText style={[styles.eyebrow, { color: ink.sub }]}>
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
