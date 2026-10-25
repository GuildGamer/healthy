import type { MatchStanding } from '@product/client';
import { fontSize, fontWeight, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { DeckSectionTitle } from '@/components/deck';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { GroupFace } from './GroupFace';
import { type GroupRules } from './group-rule-copy';
import { groupToneFor } from './group-tone';
import { displayNameFor } from './group-today';
import { BOARD_COPY, GROUPS_COPY } from './match-copy';
import { formatBoardScore } from './match-metric';
import { standingProgress } from './standing-progress';

const LANE_FACE_SIZE = 36;

interface GroupStandingsProps {
  standings: readonly MatchStanding[];
  rules: GroupRules;
  /** Opens a member's photo, the one thing a face in the standings does. */
  onPreviewPhoto: (imageUri: string) => void;
  /** Leave the podium's three out of a finished board's list. */
  skipTop?: number;
  hasTitle?: boolean;
}

/** Standings as a divider list, each bar measured against the leader. */
export function GroupStandings({
  standings,
  rules,
  onPreviewPhoto,
  skipTop = 0,
  hasTitle = true,
}: GroupStandingsProps) {
  const leadScore = Math.max(0, ...standings.map((row) => row.score));
  const rows = standings.slice(skipTop);

  return (
    <View testID="match-standings">
      {hasTitle ? <DeckSectionTitle label={BOARD_COPY.standings} /> : null}
      {rows.map((row, index) => (
        <StandingLane
          isFirst={index === 0}
          key={row.userId}
          leadScore={leadScore}
          onPreviewPhoto={onPreviewPhoto}
          row={row}
          rules={rules}
        />
      ))}
    </View>
  );
}

/** A pending seat shows no score at all; an empty one shows a dash, not a zero. */
function laneScoreText(row: MatchStanding, rules: GroupRules): string {
  if (row.isPending) {
    return '';
  }

  if (row.score === 0) {
    return GROUPS_COPY.noPlace;
  }

  const formatted = formatBoardScore(rules.scoringMode, rules.metric, row.score);
  if (!formatted.unit) {
    return formatted.value;
  }

  return `${formatted.value} ${formatted.unit}`;
}

function StandingLane({
  row,
  rules,
  leadScore,
  isFirst,
  onPreviewPhoto,
}: {
  row: MatchStanding;
  rules: GroupRules;
  leadScore: number;
  isFirst: boolean;
  onPreviewPhoto: (imageUri: string) => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { fraction } = standingProgress({ score: row.score, leadScore });
  const hasScore = row.score > 0 && !row.isPending;
  const photo = row.image ?? null;

  return (
    <View
      style={[
        styles.lane,
        isFirst || row.isYou ? null : styles.divided,
        row.isYou ? styles.you : null,
        row.isPending ? styles.pending : null,
      ]}
      testID={`match-standing-${row.userId}`}
    >
      <Text style={styles.rank}>{hasScore ? row.rank : GROUPS_COPY.noPlace}</Text>
      <GroupFace
        accessibilityLabel={`${row.displayName}’s photo`}
        image={photo}
        look="lit"
        name={row.displayName}
        onPress={photo ? () => onPreviewPhoto(photo) : undefined}
        size={LANE_FACE_SIZE}
        testID={`match-standing-avatar-${row.userId}`}
        userId={row.userId}
      />
      <View style={styles.body}>
        <View style={styles.top}>
          <Text numberOfLines={1} style={styles.name}>
            {displayNameFor(row)}
            {row.isPending ? <Text style={styles.note}> {BOARD_COPY.invited}</Text> : null}
          </Text>
          <Text style={styles.score}>{laneScoreText(row, rules)}</Text>
        </View>
        <View style={styles.track}>
          <View
            style={[
              styles.bar,
              { width: `${fraction * 100}%`, backgroundColor: groupToneFor(theme, rules).tone },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    lane: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: spacing.xs,
    },
    divided: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    you: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      marginHorizontal: -spacing.sm,
      paddingHorizontal: 12,
    },
    pending: {
      opacity: 0.5,
    },
    rank: {
      width: 18,
      textAlign: 'center',
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
    },
    body: {
      flex: 1,
      minWidth: 0,
    },
    top: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    name: {
      flexShrink: 1,
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: fontWeight.medium,
    },
    note: {
      color: theme.colors.muted,
      fontSize: 12.5,
      fontWeight: fontWeight.regular,
    },
    score: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: fontWeight.medium,
    },
    track: {
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.border,
      marginTop: 7,
      overflow: 'hidden',
    },
    bar: {
      height: '100%',
      borderRadius: 3,
    },
  });
