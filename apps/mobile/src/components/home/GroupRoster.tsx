import type { MatchListItem, MatchStanding } from '@product/client';
import { fontSize, fontWeight } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { matchScoreUnitFor } from '@/components/matches/match-metric';
import { ProfileAvatar } from '@/components/profile';
import { type Theme, useThemedStyles } from '@/theme';
import { TODAY_COPY } from './constants/today-copy';

const FACE_SIZE = 28;
/** A seat that has not accepted yet reads as held, not as losing. */
const PENDING_OPACITY = 0.5;

type GroupRosterProps = Pick<MatchListItem, 'roster' | 'scoringMode' | 'metric'>;

/** The race in three lines: who, and how far. No feed, nothing from outside the group. */
export function GroupRoster({ roster, scoringMode, metric }: GroupRosterProps) {
  return (
    <View testID="home-group-roster">
      {roster.map((standing, index) => (
        <RosterRow
          isFirst={index === 0}
          key={standing.userId}
          standing={standing}
          unit={matchScoreUnitFor(scoringMode, metric, standing.score)}
        />
      ))}
    </View>
  );
}

function RosterRow({
  standing,
  unit,
  isFirst,
}: {
  standing: MatchStanding;
  unit: string;
  isFirst: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const name = standing.isYou ? TODAY_COPY.you : standing.displayName;

  return (
    <View
      style={[
        styles.row,
        isFirst ? null : styles.divided,
        standing.isPending ? styles.pending : null,
      ]}
      testID={`home-roster-${standing.userId}`}
    >
      <ProfileAvatar imageUri={standing.image} name={standing.displayName} size={FACE_SIZE} />
      <Text numberOfLines={1} style={styles.name}>
        {name}
      </Text>
      <Text style={styles.score}>
        {standing.score}
        <Text style={styles.unit}> {unit}</Text>
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
    },
    divided: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.deckCards.track,
    },
    pending: {
      opacity: PENDING_OPACITY,
    },
    name: {
      flex: 1,
      color: theme.deckCards.text,
      fontSize: 15,
      fontWeight: fontWeight.medium,
    },
    score: {
      color: theme.deckCards.text,
      fontSize: fontSize.lg,
      fontWeight: fontWeight.semibold,
    },
    unit: {
      color: theme.deckCards.subtext,
      fontSize: fontSize.xs,
      fontWeight: fontWeight.medium,
    },
  });
