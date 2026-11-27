import type { MatchBoard } from '@product/client';
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
import { honorBoardLine, honorChallengeTitle, honorMetaLine } from './honor-copy';
import { honorFillFor, honorInkFor } from './honor-palettes';

/** Summary poster listing who earned which honor. */
export function GroupHonorsBoardCard({
  board,
  corners = 'round',
  width = SHARE_POSTER_WIDTH,
  height = SHARE_POSTER_HEIGHT,
}: {
  board: MatchBoard;
  corners?: 'round' | 'square';
  width?: number;
  height?: number;
}) {
  const honors = board.honors ?? [];
  const challenge = honorChallengeTitle(board);
  const ink = honorInkFor('honors_board');
  const radius = corners === 'round' ? SHARE_POSTER_RADIUS : 0;
  const layoutScale = width / SHARE_POSTER_WIDTH;
  const pad = SHARE_POSTER_PADDING * layoutScale;
  const eyebrowStyle = [
    styles.eyebrow,
    { color: ink.sub, fontSize: (fontSize.sm - 1) * layoutScale },
  ];

  return (
    <View
      style={[styles.shell, { width, height }, corners === 'round' ? { borderRadius: radius } : null]}
      testID="match-honors-board-card"
    >
      <View
        style={[
          styles.fill,
          { backgroundColor: honorFillFor('honors_board'), borderRadius: radius },
        ]}
      />
      <View style={[styles.type, { padding: pad }]}>
        <SharePosterText style={eyebrowStyle}>
          {challenge ?? honorMetaLine(board)}
        </SharePosterText>
        <SharePosterText
          style={[
            styles.title,
            {
              color: ink.text,
              fontSize: 28 * layoutScale,
              marginTop: spacing.md * layoutScale,
            },
          ]}
        >
          Honors
        </SharePosterText>
        <View
          style={[
            styles.list,
            { marginTop: spacing.lg * layoutScale, gap: 8 * layoutScale },
          ]}
        >
          {honors.slice(0, 6).map((row) => (
            <SharePosterText
              key={`${row.kind}-${row.userId}`}
              style={[
                styles.line,
                {
                  color: ink.sub,
                  fontSize: 14 * layoutScale,
                  lineHeight: 20 * layoutScale,
                },
              ]}
            >
              {honorBoardLine(row)}
            </SharePosterText>
          ))}
        </View>
        <View
          style={[
            styles.brand,
            {
              borderTopColor: ink.track,
              paddingTop: 14 * layoutScale,
            },
          ]}
        >
          <ShareBrandLockup color={ink.text} height={Math.round(40 * layoutScale)} />
          <SharePosterText style={eyebrowStyle}>{`${board.participantCount} people`}</SharePosterText>
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
  eyebrow: {
    fontWeight: fontWeight.medium,
  },
  title: {
    fontWeight: fontWeight.bold,
  },
  list: {
    flex: 1,
  },
  line: {},
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
