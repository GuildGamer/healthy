import type { MatchBoard } from '@product/client';
import { fontSize, fontWeight, spacing } from '@product/brand';
import { StyleSheet, View } from 'react-native';
import {
  SHARE_POSTER_HEIGHT,
  SHARE_POSTER_PADDING,
  SHARE_POSTER_RADIUS,
  SHARE_POSTER_WIDTH,
} from '@/components/challenges/SharePosterCard';
import { posterValueMetrics } from '@/components/challenges/share-poster';
import { SharePosterText } from '@/components/challenges/SharePosterText';
import { ShareBrandLockup } from '@/components/share/ShareBrandLockup';
import { useTheme } from '@/theme';
import { GroupFace } from './GroupFace';
import { honorChallengeTitle } from './honor-copy';
import { groupRecapContent } from './group-recap';
import { groupToneFor } from './group-tone';

/** Drawn at this width and exported at 1080, so the type scale is fixed, not fitted. */
export const GROUP_RECAP_CARD_WIDTH = SHARE_POSTER_WIDTH;

/**
 * A finished group as a deck poster: your place (or score) as one numeral,
 * hairline brand row. Same family as `SharePosterCard`, filled with the
 * group's activity (or streak) colour. Pass width/height for the in-app
 * preview; the capture twin keeps the design size.
 */
export function GroupRecapCard({
  board,
  corners = 'round',
  width = SHARE_POSTER_WIDTH,
  height = SHARE_POSTER_HEIGHT,
  testID = 'match-recap-card',
}: {
  board: MatchBoard;
  corners?: 'round' | 'square';
  width?: number;
  height?: number;
  testID?: string;
}) {
  const theme = useTheme();
  const content = groupRecapContent(board);
  const tone = groupToneFor(theme, board);
  const layoutScale = width / SHARE_POSTER_WIDTH;
  const baseValue = posterValueMetrics(content.hero.value);
  const valueMetrics = {
    fontSize: baseValue.fontSize * layoutScale,
    letterSpacing: baseValue.letterSpacing * layoutScale,
    lineHeight: baseValue.lineHeight * layoutScale,
  };
  const brandMeta = content.facts[0]?.value ?? content.length;
  const you = board.standings.find((row) => row.isYou);
  const challenge = honorChallengeTitle(board);
  const ink = {
    text: theme.deckCards.text,
    subtext: theme.deckCards.subtext,
    track: theme.deckCards.track,
  };
  const radius = corners === 'round' ? SHARE_POSTER_RADIUS : 0;
  const pad = SHARE_POSTER_PADDING * layoutScale;
  const faceSize = Math.round(36 * layoutScale);
  const labelStyle = [
    styles.label,
    { color: ink.subtext, fontSize: fontSize.sm * layoutScale },
  ];

  return (
    <View
      style={[styles.shell, { width, height }, corners === 'round' ? { borderRadius: radius } : null]}
      testID={testID}
    >
      <View style={[styles.fill, { backgroundColor: tone.fill, borderRadius: radius }]} />
      <View style={[styles.type, { padding: pad }]}>
        {you ? (
          <View style={[styles.identity, { gap: 10 * layoutScale }]}>
            <GroupFace
              image={you.image}
              look="lit"
              name={you.displayName}
              size={faceSize}
              userId={you.userId}
            />
            <View style={styles.identityText}>
              <SharePosterText
                style={[
                  styles.name,
                  { color: ink.text, fontSize: 15 * layoutScale },
                ]}
              >
                {you.displayName}
              </SharePosterText>
              {challenge ? (
                <SharePosterText style={labelStyle}>{challenge}</SharePosterText>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={[styles.top, { gap: spacing.sm * layoutScale }]}>
            <SharePosterText style={labelStyle}>{content.kind}</SharePosterText>
            <SharePosterText style={labelStyle}>{content.length}</SharePosterText>
          </View>
        )}
        <SharePosterText
          adjustsFontSizeToFit
          numberOfLines={1}
          style={[styles.value, { color: ink.text }, valueMetrics]}
        >
          {content.hero.value}
        </SharePosterText>
        <SharePosterText
          style={[
            styles.unit,
            {
              color: ink.subtext,
              fontSize: 17 * layoutScale,
              marginTop: spacing.sm * layoutScale,
            },
          ]}
        >
          {content.hero.unit}
        </SharePosterText>
        <View
          style={[
            styles.brand,
            {
              borderTopColor: ink.track,
              marginTop: 20 * layoutScale,
              paddingTop: 14 * layoutScale,
            },
          ]}
        >
          <ShareBrandLockup color={ink.text} height={Math.round(40 * layoutScale)} />
          <SharePosterText style={labelStyle}>{brandMeta}</SharePosterText>
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
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  label: {
    fontWeight: fontWeight.medium,
  },
  value: {
    fontWeight: fontWeight.semibold,
    marginTop: 'auto',
  },
  unit: {},
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
